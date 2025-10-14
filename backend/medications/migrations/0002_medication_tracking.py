# Generated manually for medication tracking features

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    """Duplicate manual migration neutralized.
    The functionality (added tracking fields & MedicationLog model) was
    implemented in the concurrently created migration
    '0002_medication_end_date_medication_refill_threshold_and_more'.
    To resolve a duplicate column error during test DB setup, this
    migration has been converted into a no-op while kept in history to
    satisfy the merge migration 0003.
    """

    dependencies = [
        ('medications', '0001_initial'),
    ]

    # No operations – intentionally left blank to avoid duplicate field additions
    operations = []
