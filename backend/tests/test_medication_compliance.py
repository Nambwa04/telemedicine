from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from medications.models import Medication, MedicationLog, ComplianceFollowUp
from medications.utils import compute_noncompliance_risk, evaluate_and_create_followups_for_medications
from datetime import timedelta


class MedicationComplianceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.patient = User.objects.create_user(email='p@example.com', username='p', password='pass', role='patient')
        self.doc = User.objects.create_user(email='d@example.com', username='d', password='pass', role='doctor')
        self.med = Medication.objects.create(
            patient=self.patient,
            name='Amoxicillin',
            dosage='500mg',
            frequency='twice daily',
            total_quantity=20,
            remaining_quantity=4,
            refill_threshold=7,
            start_date=timezone.now().date() - timedelta(days=10),
        )

    def test_risk_score_increases_with_no_logs(self):
        score_no_logs = compute_noncompliance_risk(self.med)
        # Add logs matching some adherence
        MedicationLog.objects.create(medication=self.med, taken_at=timezone.now() - timedelta(days=1))
        MedicationLog.objects.create(medication=self.med, taken_at=timezone.now() - timedelta(days=2))
        score_with_logs = compute_noncompliance_risk(self.med)
        self.assertLess(score_with_logs, score_no_logs)

    def test_followups_created_for_rules(self):
        # Low remaining quantity should trigger REFILL_NEEDED
        counts = evaluate_and_create_followups_for_medications([self.med], created_by=self.doc)
        self.assertGreaterEqual(counts.get('refill_needed', 0), 1)
        self.assertTrue(ComplianceFollowUp.objects.filter(medication=self.med, reason='refill_needed').exists())
