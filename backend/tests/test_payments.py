"""
Integration tests for the Payments API.
Covers B2C payout initiation via Safaricom Daraja and handling of callback results.
"""
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from django.urls import reverse
from .factories import create_admin, create_caregiver
from payments.models import Payout


class PaymentsApiTests(APITestCase):
    def setUp(self):
        self.admin = create_admin('payadmin@example.com')
        self.caregiver = create_caregiver('paycare@example.com')

    def auth_as(self, user):
        self.client.force_authenticate(user)

    @patch('payments.daraja.encrypt_initiator_password', return_value='SEC')
    @patch('payments.daraja.get_access_token', return_value='TOKEN')
    @patch('payments.daraja.requests.post')
    def test_b2c_payout_and_callbacks(self, m_post, m_token, m_sec):
        # Mock Daraja success response
        m_post.return_value.status_code = 200
        m_post.return_value.json.return_value = {
            'ConversationID': 'conv-123',
            'OriginatorConversationID': 'oc-456',
            'ResponseDescription': 'Accepted'
        }

        self.auth_as(self.admin)
        url = reverse('payments:b2c_payout')
        payload = {
            'recipient_id': self.caregiver.id,
            'phone': '254700000000',
            'amount': 100,
            'remarks': 'Test'
        }
        r = self.client.post(url, payload, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        payout_id = r.data['id']
        p = Payout.objects.get(id=payout_id)
        self.assertEqual(p.safaricom_conversation_id, 'conv-123')

        # Result callback -> success
        result_url = reverse('payments:b2c_result')
        cb_payload = {
            'Result': {
                'ConversationID': 'conv-123',
                'ResultCode': '0',
                'ResultDesc': 'Done'
            }
        }
        rc = self.client.post(result_url, cb_payload, format='json')
        self.assertEqual(rc.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertEqual(p.status, Payout.Status.SUCCESS)

        # Timeout callback
        timeout_url = reverse('payments:b2c_timeout')
        tc = self.client.post(timeout_url, {'ConversationID': 'conv-123'}, format='json')
        self.assertEqual(tc.status_code, status.HTTP_200_OK)
