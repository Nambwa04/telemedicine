from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_doctor'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='latitude',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='longitude',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='location_updated_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
