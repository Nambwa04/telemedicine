from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL


class CaregiverAvailability(models.Model):
    """
    Manages caregiver availability with specific time slots.
    When a booking is made, the slot is marked as unavailable.
    """
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    caregiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='availability_slots',
        limit_choices_to={'role': 'caregiver'}
    )
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['caregiver', 'day_of_week']),
            models.Index(fields=['is_available']),
        ]
        unique_together = ['caregiver', 'day_of_week', 'start_time']
    
    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.caregiver.email} - {self.get_day_of_week_display()} {self.start_time}-{self.end_time} ({status})"
    
    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError('End time must be after start time')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class SpecificDateAvailability(models.Model):
    """
    Override availability for specific dates (e.g., holidays, vacation days, or one-time bookings).
    """
    caregiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='specific_availability',
        limit_choices_to={'role': 'caregiver'}
    )
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_available = models.BooleanField(default=False)
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    # Link to appointment or booking if this unavailability is due to a booking
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='availability_blocks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date', 'start_time']
        indexes = [
            models.Index(fields=['caregiver', 'date']),
            models.Index(fields=['is_available']),
        ]
        verbose_name_plural = 'Specific date availabilities'
    
    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        time_str = f"{self.start_time}-{self.end_time}" if self.start_time and self.end_time else "All day"
        return f"{self.caregiver.email} - {self.date} {time_str} ({status})"
    
    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError('End time must be after start time')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
