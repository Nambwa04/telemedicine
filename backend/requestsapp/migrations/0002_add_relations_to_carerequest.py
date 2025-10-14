from django.db import migrations, models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('requestsapp', '0001_initial'),
        ('accounts', '0005_user_experience_years_user_license_number_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='carerequest',
            name='patient',
            field=models.ForeignKey(blank=True, help_text='Patient for whom the care is requested.', null=True, on_delete=models.deletion.CASCADE, related_name='care_requests', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='carerequest',
            name='caregiver',
            field=models.ForeignKey(blank=True, help_text='Caregiver assigned to fulfill the request.', null=True, on_delete=models.deletion.SET_NULL, related_name='assigned_care_requests', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='carerequest',
            name='created_by',
            field=models.ForeignKey(blank=True, help_text='User who created the request (auditing).', null=True, on_delete=models.deletion.SET_NULL, related_name='created_care_requests', to=settings.AUTH_USER_MODEL),
        ),
    ]
