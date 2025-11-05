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
    # Personal details
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, default="")
    address = models.TextField(blank=True, default="")
    emergency_contact = models.JSONField(default=dict, blank=True)
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
    # Caregiver profile fields
    experience_years = models.PositiveIntegerField(default=0)
    specializations = models.JSONField(default=list, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bio = models.TextField(blank=True, default="")
    is_verified = models.BooleanField(default=False)

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


class VerificationDocument(models.Model):
    """Professional verification document uploaded by a user (doctor or caregiver)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_documents')
    file = models.FileField(upload_to='verification_docs/%Y/%m/', max_length=512)
    doc_type = models.CharField(max_length=120, blank=True, default='')
    note = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_documents')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    review_note = models.TextField(blank=True, default='')

    def __str__(self):
        return f"VerificationDocument(user={self.user_id}, uploaded_at={self.uploaded_at})"
