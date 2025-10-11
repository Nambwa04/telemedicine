from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

from django.utils import timezone

class VitalReading(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vital_readings')
    date = models.DateField(default=timezone.now)
    blood_pressure_systolic = models.IntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True)
    heart_rate = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    blood_sugar = models.IntegerField(null=True, blank=True)
    temperature = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

class SymptomLog(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='symptoms')
    date = models.DateField()
    symptom = models.CharField(max_length=255)
    severity = models.IntegerField()
    duration = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class LabResult(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_results')
    test = models.CharField(max_length=255)
    value = models.CharField(max_length=100)
    range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=50)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
