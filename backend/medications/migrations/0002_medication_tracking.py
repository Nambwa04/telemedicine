# Generated manually for medication tracking features

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('medications', '0001_initial'),  # Adjust this to your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='medication',
            name='total_quantity',
            field=models.IntegerField(default=0, help_text='Total quantity prescribed (e.g., 30 pills)'),
        ),
        migrations.AddField(
            model_name='medication',
            name='remaining_quantity',
            field=models.IntegerField(default=0, help_text='Quantity remaining'),
        ),
        migrations.AddField(
            model_name='medication',
            name='refill_threshold',
            field=models.IntegerField(default=7, help_text='Alert when this many doses remain'),
        ),
        migrations.AddField(
            model_name='medication',
            name='start_date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='medication',
            name='end_date',
            field=models.DateField(blank=True, help_text='Expected end date of prescription', null=True),
        ),
        migrations.CreateModel(
            name='MedicationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('taken_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('doses_taken', models.IntegerField(default=1, help_text='Number of doses taken')),
                ('notes', models.TextField(blank=True, null=True)),
                ('medication', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='medications.medication')),
            ],
            options={
                'ordering': ['-taken_at'],
            },
        ),
    ]
