from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('caregiver', 'Caregiver'),
    ]
    username = models.CharField(max_length=150, unique=True)  # keep for compatibility
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    primary_condition = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    # Realtime location for caregivers (and optionally others)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    # Doctor assignment for patients
    doctor = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='patients',
        limit_choices_to={'role': 'doctor'}
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    used = models.BooleanField(default=False)

    def mark_used(self):
        self.used = True
        self.save(update_fields=['used'])

    def __str__(self):
        return f"EmailVerificationToken({self.user.email}, used={self.used})"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    used = models.BooleanField(default=False)

    def mark_used(self):
        self.used = True
        self.save(update_fields=['used'])

    def __str__(self):
        return f"PasswordResetToken({self.user.email}, used={self.used})"
