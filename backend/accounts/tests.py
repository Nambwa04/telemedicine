from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from tests.factories import create_admin, create_doctor, create_patient, create_caregiver


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
		resp = self.client.patch(url, {"date_of_birth": "31-12-2024"}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('date_of_birth', resp.data.get('errors', {}))
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
		resp = self.client.patch(url, {}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
		resp = self.client.patch(url, {"latitude": -1.2921, "longitude": 36.8219}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_200_OK)

	def test_patient_list_visibility_for_doctor(self):
		other_patient = create_patient("pat2@example.com", doctor=self.doctor)
		create_patient("pat3@example.com")
		self.auth_as(self.doctor)
		url = reverse('patients')
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		data = resp.data
		if isinstance(data, dict) and 'results' in data:
			items = data['results']
		else:
			items = data
		emails = [u['email'] for u in items]
		self.assertIn(self.patient.email, emails)
		self.assertIn(other_patient.email, emails)
		self.assertNotIn('pat3@example.com', emails)

	def test_caregiver_list_proximity_and_search(self):
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
			'max_distance': 1000
		})
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		emails = [r['email'] for r in resp.data]
		self.assertIn(self.caregiver.email, emails)
		self.assertIn(near.email, emails)
		self.assertNotIn(far.email, emails)

	def test_verification_document_upload_and_admin_review(self):
		self.auth_as(self.caregiver)
		upload_url = reverse('me-verification-doc-upload')
		file = SimpleUploadedFile("license.pdf", b"%PDF-1.4 test", content_type="application/pdf")
		resp = self.client.post(upload_url, {'file': file, 'doc_type': 'license', 'note': 'Test'}, format='multipart')
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		doc_id = resp.data['id']
		self.auth_as(self.admin)
		list_url = reverse('admin-user-verification-docs', args=[self.caregiver.id])
		resp = self.client.get(list_url)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		review_url = reverse('admin-verification-doc-review', args=[doc_id])
		resp = self.client.post(review_url, {'decision': 'approved', 'review_note': 'Looks good'}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_200_OK)

	def test_dashboard_stats(self):
		from appointments.models import Appointment
		from datetime import date, time
		Appointment.objects.create(patient=self.patient, doctor=self.doctor, date=date.today(), time=time(9, 0), type='Check', status='scheduled')
		self.auth_as(self.doctor)
		url = reverse('dashboard-stats')
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		payload = resp.json()
		for key in ["todayAppointments", "totalPatients", "pendingConsults", "completedToday"]:
			self.assertIn(key, payload)
