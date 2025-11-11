from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from tests.factories import create_patient, create_doctor, create_caregiver
from .models import Medication


class MedicationApiTests(APITestCase):
	def setUp(self):
		self.doctor = create_doctor('doc3@example.com')
		self.patient = create_patient('pat3@example.com', doctor=self.doctor)
		self.caregiver = create_caregiver('care3@example.com')

	def auth_as(self, user):
		self.client.force_authenticate(user)

	def test_prescriptions_create_and_list(self):
		self.auth_as(self.caregiver)
		r = self.client.post('/api/medications/prescriptions/', {
			'name': 'MedA', 'dosage': '10mg', 'frequency': 'once daily',
			'total_quantity': 30, 'remaining_quantity': 30,
			'start_date': timezone.now().date().isoformat(),
			'patient_id': self.patient.id
		}, format='json')
		self.assertEqual(r.status_code, status.HTTP_201_CREATED)
		self.auth_as(self.doctor)
		rlist = self.client.get('/api/medications/prescriptions/')
		self.assertEqual(rlist.status_code, status.HTTP_200_OK)
		self.assertTrue(any(m['name'] == 'MedA' for m in rlist.data))

	def test_log_intake_and_risk(self):
		self.auth_as(self.doctor)
		med = Medication.objects.create(
			patient=self.patient, name='MedB', dosage='5mg', frequency='twice', total_quantity=10, remaining_quantity=3,
			start_date=timezone.now().date()
		)
		r = self.client.post(f'/api/medications/{med.id}/log-intake/', {'doses_taken': 1}, format='json')
		self.assertEqual(r.status_code, status.HTTP_201_CREATED)
		med.refresh_from_db()
		self.assertEqual(med.remaining_quantity, 2)
		rr = self.client.get(f'/api/medications/{med.id}/risk/')
		self.assertEqual(rr.status_code, status.HTTP_200_OK)
		self.assertIn('risk_score', rr.data)
		self.assertIn('risk_level', rr.data)

	def test_at_risk_listing_and_scan_followups(self):
		self.auth_as(self.doctor)
		Medication.objects.create(
			patient=self.patient, name='MedC', dosage='5mg', frequency='twice daily', total_quantity=10, remaining_quantity=0,
			start_date=timezone.now().date()
		)
		rr = self.client.get('/api/medications/at-risk/')
		self.assertEqual(rr.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(rr.data), 1)
		rf = self.client.post('/api/medications/scan-and-followups/')
		self.assertEqual(rf.status_code, status.HTTP_200_OK)
		self.assertIn('created', rf.data)
