from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from .factories import create_admin, create_doctor, create_patient, create_caregiver


User = get_user_model()


class AccountsApiTests(APITestCase):
    def setUp(self):
        self.admin = create_admin()
        self.doctor = create_doctor("doc1@example.com", first_name="Doc", last_name="One")
        self.patient = create_patient("pat1@example.com", first_name="Pat", last_name="One", doctor=self.doctor)
        self.caregiver = create_caregiver("care1@example.com", first_name="Care", last_name="One")

    def auth_as(self, user):
        self.client.force_authenticate(user)

    def test_me_patch_validation_and_update(self):
        self.auth_as(self.caregiver)
        url = reverse('me')
        # invalid date format
        resp = self.client.patch(url, {"date_of_birth": "31-12-2024"}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', resp.data.get('errors', {}))
        # valid payload
        payload = {
            "experience_years": 3,
            "hourly_rate": "150.50",
            "specializations": ["Elderly care", "Diabetes"],
            "bio": "Experienced caregiver",
            "emergency_contact": {"name": "Jane", "phone": "+254700000000", "relationship": "Sister"}
        }
        resp = self.client.patch(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['experience_years'], 3)
        self.assertEqual(str(resp.data['hourly_rate']), '150.50')
        self.assertEqual(resp.data['specializations'], payload['specializations'])

    def test_me_location_update(self):
        self.auth_as(self.patient)
        url = reverse('me-location')
        # missing params
        resp = self.client.patch(url, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # valid
        resp = self.client.patch(url, {"latitude": -1.2921, "longitude": 36.8219}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.patient.refresh_from_db()
        self.assertAlmostEqual(self.patient.latitude, -1.2921, places=4)
        self.assertAlmostEqual(self.patient.longitude, 36.8219, places=4)

    def test_patient_list_visibility_for_doctor(self):
        other_patient = create_patient("pat2@example.com", doctor=self.doctor)
        create_patient("pat3@example.com")  # not assigned to this doctor
        self.auth_as(self.doctor)
        url = reverse('patients')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        emails = [u['email'] for u in resp.data]
        self.assertIn(self.patient.email, emails)
        self.assertIn(other_patient.email, emails)
        self.assertNotIn('pat3@example.com', emails)

    def test_caregiver_list_proximity_and_search(self):
        # Place caregivers around Nairobi CBD
        self.caregiver.latitude = -1.286389
        self.caregiver.longitude = 36.817223
        self.caregiver.save(update_fields=['latitude', 'longitude'])
        near = create_caregiver("care2@example.com", first_name="Near", latitude=-1.28333, longitude=36.81667)
        far = create_caregiver("care3@example.com", first_name="Far", latitude=-1.5, longitude=36.9)
        self.auth_as(self.patient)
        url = reverse('caregivers')
        resp = self.client.get(url, {
            'patient_lat': -1.286389,
            'patient_lng': 36.817223,
            'max_distance': 1000  # meters
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        emails = [r['email'] for r in resp.data]
        self.assertIn(self.caregiver.email, emails)
        self.assertIn(near.email, emails)
        self.assertNotIn(far.email, emails)

    def test_verification_document_upload_and_admin_review(self):
        # upload as caregiver
        self.auth_as(self.caregiver)
        upload_url = reverse('me-verification-doc-upload')
        file = SimpleUploadedFile("license.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = self.client.post(upload_url, {'file': file, 'doc_type': 'license', 'note': 'Test'}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        doc_id = resp.data['id']
        # admin lists docs and approves
        self.auth_as(self.admin)
        list_url = reverse('admin-user-verification-docs', args=[self.caregiver.id])
        resp = self.client.get(list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        review_url = reverse('admin-verification-doc-review', args=[doc_id])
        resp = self.client.post(review_url, {'decision': 'approved', 'review_note': 'Looks good'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # user becomes verified
        self.caregiver.refresh_from_db()
        self.assertTrue(self.caregiver.is_verified)

    def test_admin_verify_toggle_endpoints(self):
        self.auth_as(self.admin)
        # doctor verify toggle
        url = reverse('admin-doctor-verify', args=[self.doctor.id])
        r = self.client.post(url, {})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        prev = self.doctor.is_verified
        # explicit set
        r2 = self.client.patch(url, {'is_verified': False}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertFalse(self.doctor.is_verified)

    def test_dashboard_stats(self):
        # Create a simple appointment today
        from appointments.models import Appointment
        from datetime import date, time
        Appointment.objects.create(patient=self.patient, doctor=self.doctor, date=date.today(), time=time(9, 0), type='Check', status='scheduled')
        self.auth_as(self.doctor)
        url = reverse('dashboard-stats')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for key in ["todayAppointments", "totalPatients", "pendingConsults", "completedToday"]:
            self.assertIn(key, resp.data)

    def test_admin_analytics_shape(self):
        # Seed a few cross-domain objects
        from appointments.models import Appointment
        from medications.models import Medication
        from health.models import VitalReading
        from datetime import date, time
        Appointment.objects.create(patient=self.patient, doctor=self.doctor, date=date.today(), time=time(10, 0), type='Check', status='scheduled')
        Medication.objects.create(patient=self.patient, name='TestMed', dosage='5mg', frequency='once daily', remaining_quantity=5)
        VitalReading.objects.create(patient=self.patient, heart_rate=70)
        self.auth_as(self.admin)
        url = reverse('admin-analytics')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for k in ['users', 'appointments', 'health', 'medications', 'insights']:
            self.assertIn(k, resp.data)
