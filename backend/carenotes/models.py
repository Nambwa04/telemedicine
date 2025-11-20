from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class CareNote(models.Model):
    """
    Shared notes about a patient's care visible to:
    - The patient's assigned doctor
    - All caregivers who have worked with the patient
    - Future caregivers assigned to the patient
    """
    NOTE_TYPE_CHOICES = [
        ('general', 'General Care Note'),
        ('handoff', 'Caregiver Handoff'),
        ('observation', 'Clinical Observation'),
        ('alert', 'Important Alert'),
        ('medication', 'Medication Related'),
        ('behavior', 'Behavior Note'),
        ('emergency', 'Emergency Contact/Info'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='care_notes',
        limit_choices_to={'role': 'patient'}
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='authored_care_notes'
    )
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    title = models.CharField(max_length=255, blank=True, default='')
    content = models.TextField()
    is_pinned = models.BooleanField(default=False, help_text='Pin important notes to the top')
    is_archived = models.BooleanField(default=False, help_text='Archive old/resolved notes')
    
    # Optional linking to specific records
    related_appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_notes'
    )
    related_medication = models.ForeignKey(
        'medications.Medication',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='care_notes'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['note_type', '-created_at']),
            models.Index(fields=['priority']),
            models.Index(fields=['-is_pinned', '-created_at']),
        ]
    
    def __str__(self):
        author_name = f"{self.author.first_name} {self.author.last_name}".strip() if self.author else "Unknown"
        return f"{self.title} by {author_name} for {self.patient.email}"


class CareNoteComment(models.Model):
    """
    Allow doctors and caregivers to comment/respond to care notes
    """
    note = models.ForeignKey(
        CareNote,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='care_note_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        author_name = f"{self.author.first_name} {self.author.last_name}".strip() if self.author else "Unknown"
        return f"Comment by {author_name} on {self.note.title}"


class CareNoteRead(models.Model):
    """
    Track which caregivers/doctors have read which notes
    """
    note = models.ForeignKey(
        CareNote,
        on_delete=models.CASCADE,
        related_name='read_receipts'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='read_care_notes'
    )
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['note', 'user']
        ordering = ['-read_at']
    
    def __str__(self):
        return f"{self.user.email} read {self.note.title} at {self.read_at}"
