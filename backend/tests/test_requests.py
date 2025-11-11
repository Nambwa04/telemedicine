from rest_framework.test import APITestCase
from rest_framework import status
from .factories import create_patient, create_doctor, create_caregiver


class RequestsApiTests(APITestCase):
    def setUp(self):
        self.patient = create_patient('reqpat@example.com')
        self.doctor = create_doctor('reqdoc@example.com')
        self.caregiver = create_caregiver('reqcare@example.com')

    def test_care_request_accept_decline_flow(self):
        # patient creates
        self.client.force_authenticate(self.patient)
        r = self.client.post('/api/requests/care/', {
            'family': 'Doe', 'service': 'Home care', 'duration': '2h', 'rate': '100.00', 'unit': 'hour', 'urgent': False
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        care_id = r.data['id']
        # caregiver sees and accepts
        self.client.force_authenticate(self.caregiver)
        a = self.client.post(f'/api/requests/care/{care_id}/accept/')
        self.assertEqual(a.status_code, status.HTTP_200_OK)
        # then decline (allowed from accepted)
        d = self.client.post(f'/api/requests/care/{care_id}/decline/')
        self.assertEqual(d.status_code, status.HTTP_200_OK)

    def test_doctor_request_accept_assigns_patient_doctor(self):
        # patient creates doctor request
        self.client.force_authenticate(self.patient)
        r = self.client.post('/api/requests/doctor/', {
            'reason': 'Need GP', 'symptoms': 'Cough', 'urgent': True
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        req_id = r.data['id']
        # doctor accepts
        self.client.force_authenticate(self.doctor)
        a = self.client.post(f'/api/requests/doctor/{req_id}/accept/')
        self.assertEqual(a.status_code, status.HTTP_200_OK)
        # patient now assigned to doctor
        from django.contrib.auth import get_user_model
        User = get_user_model()
        p = User.objects.get(id=self.patient.id)
        self.assertEqual(p.doctor_id, self.doctor.id)
