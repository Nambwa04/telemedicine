from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Medication(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medications')
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    compliance = models.IntegerField(default=0)
    next_due = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.patient})"
