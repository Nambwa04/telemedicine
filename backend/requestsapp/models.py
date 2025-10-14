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
    # New relational fields
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='care_requests',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text='Patient for whom the care is requested.'
    )
    caregiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='assigned_care_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Caregiver assigned to fulfill the request.'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_care_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='User who created the request (auditing).'
    )

    def __str__(self):
        return f"{self.family} - {self.service}"


class DoctorRequest(models.Model):
    """
    Model for patients to request assignment to a doctor.
    Once accepted, the patient becomes assigned to that doctor.
    """
    STATUS_CHOICES = [
        ('new', 'New'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
    ]
    
    SPECIALIZATION_CHOICES = [
        ('general', 'General Medicine'),
        ('cardiology', 'Cardiology'),
        ('dermatology', 'Dermatology'),
        ('neurology', 'Neurology'),
        ('pediatrics', 'Pediatrics'),
        ('psychiatry', 'Psychiatry'),
        ('orthopedics', 'Orthopedics'),
        ('gynecology', 'Gynecology'),
    ]
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='doctor_requests_made',
        on_delete=models.CASCADE,
        help_text='Patient requesting doctor assignment'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='doctor_requests_received',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Doctor being requested'
    )
    reason = models.TextField(help_text='Reason for requesting this doctor')
    symptoms = models.TextField(blank=True, help_text='Current symptoms or conditions')
    preferred_date = models.DateField(null=True, blank=True, help_text='Preferred first appointment date')
    preferred_time = models.TimeField(null=True, blank=True, help_text='Preferred first appointment time')
    urgent = models.BooleanField(default=False, help_text='Is this request urgent?')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True, help_text='Additional notes from patient')
    doctor_notes = models.TextField(blank=True, help_text='Notes from doctor')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        doctor_name = f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else "Unassigned"
        patient_name = f"{self.patient.first_name} {self.patient.last_name}"
        return f"{patient_name} -> {doctor_name} ({self.status})"
