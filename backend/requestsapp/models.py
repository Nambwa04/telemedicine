from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class CareRequest(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('accepted', 'Accepted'),
        ('in-progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('declined', 'Declined'),
    ]
    family = models.CharField(max_length=255)
    service = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=50, default='hour')
    urgent = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.family} - {self.service}"
