from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('medications', '0003_merge_20251010_2211'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ComplianceFollowUp',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('due_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed'), ('canceled', 'Canceled')], default='pending', max_length=20)),
                ('reason', models.CharField(choices=[('low_compliance', 'Low compliance'), ('missed_doses', 'Missed doses'), ('refill_needed', 'Refill needed'), ('no_logs', 'No recent logs'), ('high_risk', 'High non-compliance risk')], max_length=50)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('risk_score_snapshot', models.FloatField(blank=True, help_text='Risk score (0-1) at time of creation', null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_followups', to=settings.AUTH_USER_MODEL)),
                ('medication', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='followups', to='medications.medication')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_followups', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['status', 'due_at'],
            },
        ),
    ]
