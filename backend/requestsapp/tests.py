from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import CareRequest

User = get_user_model()


class CareRequestActionTests(APITestCase):
    def setUp(self):
        self.caregiver = User.objects.create_user(email='caregiver@example.com', password='pass1234', username='cg1', role='caregiver')
        self.patient = User.objects.create_user(email='patient@example.com', password='pass1234', username='pt1', role='patient')
        self.admin = User.objects.create_user(email='admin@example.com', password='pass1234', username='ad1', role='admin')
        self.request_obj = CareRequest.objects.create(
            family='Smith', service='General Care', duration='4', rate=25, unit='hour', urgent=False, status='new', patient=self.patient, created_by=self.patient
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_caregiver_can_accept_new_request(self):
        self.auth(self.caregiver)
        url = f"/api/requests/{self.request_obj.id}/accept/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, 'accepted')
        self.assertEqual(self.request_obj.caregiver, self.caregiver)

    def test_caregiver_cannot_accept_non_new(self):
        self.request_obj.status = 'accepted'
        self.request_obj.save()
        self.auth(self.caregiver)
        url = f"/api/requests/{self.request_obj.id}/accept/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_caregiver_can_decline_new(self):
        self.auth(self.caregiver)
        url = f"/api/requests/{self.request_obj.id}/decline/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, 'declined')

    def test_admin_can_accept(self):
        self.auth(self.admin)
        url = f"/api/requests/{self.request_obj.id}/accept/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, 'accepted')
        # caregiver stays unset since admin accepted
        self.assertIsNone(self.request_obj.caregiver)

    def test_patient_cannot_accept(self):
        self.auth(self.patient)
        url = f"/api/requests/{self.request_obj.id}/accept/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
