from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthAndAppointmentTests(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(email='doc@example.com', username='doc', role='doctor', password='Pass12345!')
        self.patient = User.objects.create_user(email='pat@example.com', username='pat', role='patient', password='Pass12345!')

    def authenticate(self, email, password):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'email': email, 'password': password}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_register(self):
        url = reverse('register')
        response = self.client.post(url, {
            'email': 'new@example.com',
            'username': 'newuser',
            'role': 'patient',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_appointment(self):
        self.authenticate('doc@example.com', 'Pass12345!')
        url = '/api/appointments/'
        response = self.client.post(url, {
            'date': '2025-09-30',
            'time': '09:00:00',
            'type': 'Check-up',
            'notes': 'Initial visit',
            'patient_id': self.patient.id,
            'doctor_id': self.doctor.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_patient_list_own_appointments(self):
        self.authenticate('doc@example.com', 'Pass12345!')
        # create appointment
        create_resp = self.client.post('/api/appointments/', {
            'date': '2025-09-30',
            'time': '09:00:00',
            'type': 'Check-up',
            'notes': 'Initial visit',
            'patient_id': self.patient.id,
            'doctor_id': self.doctor.id
        }, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.client.credentials()
        self.authenticate('pat@example.com', 'Pass12345!')
        list_resp = self.client.get('/api/appointments/')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        # May be paginated
        if isinstance(list_resp.data, dict) and 'results' in list_resp.data:
            self.assertEqual(len(list_resp.data['results']), 1)
        else:
            self.assertEqual(len(list_resp.data), 1)

    def test_patients_list_endpoint(self):
        # create extra patients
        User.objects.create_user(email='pat2@example.com', username='pat2', role='patient', password='Pass12345!')
        self.authenticate('doc@example.com', 'Pass12345!')
        resp = self.client.get('/api/accounts/patients/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 2)

    def test_profile_update(self):
        self.authenticate('pat@example.com', 'Pass12345!')
        resp = self.client.patch('/api/accounts/me/', {'first_name': 'Patty'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['first_name'], 'Patty')

    def test_email_verification_and_password_reset(self):
        # Create inactive user
        u = User.objects.create_user(email='inactive@example.com', username='inactive', role='patient', password='TempPass123!', is_active=False)
        # Request verification
        r = self.client.post('/api/accounts/email/verify/request/', {'email': 'inactive@example.com'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        token = r.data['token']
        # Confirm
        r2 = self.client.post('/api/accounts/email/verify/confirm/', {'token': token})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        u.refresh_from_db()
        self.assertTrue(u.is_active)
        # Request password reset
        r3 = self.client.post('/api/accounts/password/reset/request/', {'email': 'inactive@example.com'})
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        pr_token = r3.data['token']
        # Confirm password reset
        r4 = self.client.post('/api/accounts/password/reset/confirm/', {'token': pr_token, 'new_password': 'BrandNew123!'})
        self.assertEqual(r4.status_code, status.HTTP_200_OK)
        # Login with new password
        auth_resp = self.client.post('/api/auth/token/', {'email': 'inactive@example.com', 'password': 'BrandNew123!'})
        self.assertEqual(auth_resp.status_code, status.HTTP_200_OK)
