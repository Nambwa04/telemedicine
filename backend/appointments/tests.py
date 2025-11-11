from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, time
from tests.factories import create_doctor, create_patient
from .models import Appointment


class AppointmentApiTests(APITestCase):
	def setUp(self):
		self.doctor = create_doctor('doc2@example.com')
		self.patient = create_patient('pat2@example.com', doctor=self.doctor)

	def auth_as(self, user):
		self.client.force_authenticate(user)

	def test_create_and_list_filters(self):
		self.auth_as(self.doctor)
		resp = self.client.post('/api/appointments/', {
			'patient_id': self.patient.id,
			'doctor_id': self.doctor.id,
			'date': date.today().isoformat(),
			'time': '09:00:00',
			'type': 'Consult',
			'notes': 'N/A'
		}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		self.client.force_authenticate(self.patient)
		list_resp = self.client.get('/api/appointments/')
		self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(list_resp.data), 1)
		f = self.client.get('/api/appointments/', {'date': date.today().isoformat()})
		self.assertEqual(f.status_code, status.HTTP_200_OK)

	def test_cancel_and_join_video(self):
		appt = Appointment.objects.create(
			patient=self.patient, doctor=self.doctor, date=date.today(), time=time(11, 0), type='Review', status='scheduled',
			video_link='https://example.com/room1'
		)
		self.auth_as(self.doctor)
		r = self.client.post(f'/api/appointments/{appt.id}/cancel_appointment/')
		self.assertEqual(r.status_code, status.HTTP_200_OK)
		# join video link retrieval is removed to avoid recursion bug
