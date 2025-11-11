from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date
from tests.factories import create_caregiver, create_admin


class TimesheetApiTests(APITestCase):
	def setUp(self):
		self.caregiver = create_caregiver('timecare@example.com')
		self.admin = create_admin('timeadmin@example.com')

	def test_create_auto_calculates_and_submit_week(self):
		self.client.force_authenticate(self.caregiver)
		r = self.client.post('/api/timesheet/', {
			'date': date.today().isoformat(),
			'client': 'Acme Corp',
			'start_time': '09:00:00',
			'end_time': '17:30:00',
			'break_minutes': 30,
			'rate': '100.00',
			'notes': 'Shift',
			'caregiver': self.caregiver.id
		}, format='json')
		self.assertEqual(r.status_code, status.HTTP_201_CREATED)
		entry_id = r.data['id']
		self.assertAlmostEqual(float(r.data['hours']), 8.0, places=2)
		self.assertAlmostEqual(float(r.data['subtotal']), 800.0, places=2)
		s = self.client.post('/api/timesheet/submit_week/', {'entry_ids': [entry_id]}, format='json')
		self.assertEqual(s.status_code, status.HTTP_200_OK)
		self.assertEqual(s.data['updated_count'], 1)

	def test_admin_approve_reject(self):
		self.client.force_authenticate(self.caregiver)
		r = self.client.post('/api/timesheet/', {
			'date': date.today().isoformat(),
			'client': 'Client',
			'start_time': '10:00:00',
			'end_time': '14:00:00',
			'break_minutes': 0,
			'rate': '50.00',
			'notes': '',
			'caregiver': self.caregiver.id
		}, format='json')
		entry_id = r.data['id']
		self.client.force_authenticate(self.admin)
		a = self.client.post(f'/api/timesheet/{entry_id}/approve/')
		self.assertEqual(a.status_code, status.HTTP_200_OK)
		j = self.client.post(f'/api/timesheet/{entry_id}/reject/', {'notes': 'Incomplete'}, format='json')
		self.assertEqual(j.status_code, status.HTTP_200_OK)
