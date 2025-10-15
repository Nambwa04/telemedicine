from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from medications.models import Medication
from medications.utils import evaluate_and_create_followups_for_medications


class Command(BaseCommand):
    help = 'Evaluate medication compliance and create follow-ups where needed.'

    def add_arguments(self, parser):
        parser.add_argument('--patient-id', type=int, help='Limit to a specific patient ID')

    def handle(self, *args, **options):
        qs = Medication.objects.select_related('patient')
        if options.get('patient_id'):
            qs = qs.filter(patient_id=options['patient_id'])
        result = evaluate_and_create_followups_for_medications(qs)
        created_total = sum(result.values())
        self.stdout.write(self.style.SUCCESS(f'Compliance evaluation complete. Created {created_total} follow-ups. Details: {result}'))
