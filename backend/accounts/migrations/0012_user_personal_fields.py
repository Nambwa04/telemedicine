# Generated manually to add personal fields to User model
from django.db import migrations, models
import django.db.models.deletion


def default_emergency_contact():
    return {}

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_is_verified_verificationdocument_review_note_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='date_of_birth',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='gender',
            field=models.CharField(max_length=20, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='user',
            name='address',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='user',
            name='emergency_contact',
            field=models.JSONField(default=default_emergency_contact, blank=True),
        ),
    ]
