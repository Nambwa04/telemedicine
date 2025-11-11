from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from .factories import create_patient, create_doctor


class HealthApiTests(APITestCase):
    def setUp(self):
        self.patient = create_patient('healthpat@example.com', first_name='Health', last_name='Pat')
        self.doctor = create_doctor('healthdoc@example.com')

    def test_vitals_and_overview(self):
        self.client.force_authenticate(self.patient)
        # create a vital reading
        r = self.client.post('/api/health/vitals/', {
            'date': timezone.now().date().isoformat(),
            'heart_rate': 72,
            'temperature': 36.8
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        # overview as patient
        o = self.client.get('/api/health/overview/')
        self.assertEqual(o.status_code, status.HTTP_200_OK)
        self.assertIn('overview', o.data)
        # doctor can view with patient_id
        self.client.force_authenticate(self.doctor)
        od = self.client.get('/api/health/overview/', {'patient_id': self.patient.id})
        self.assertEqual(od.status_code, status.HTTP_200_OK)

    def test_lab_upload_accepts_file_and_date(self):
        self.client.force_authenticate(self.doctor)
        url = '/api/health/lab-results/upload/'
        file = SimpleUploadedFile('cbc.pdf', b'filecontent', content_type='application/pdf')
        r = self.client.post(url, {
            'file': file,
            'patient_id': self.patient.id,
            'test': 'CBC',
            'upload_date': timezone.now().date().isoformat(),
            'status': 'completed'
        }, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
