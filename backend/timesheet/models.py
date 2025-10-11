from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class TimesheetEntry(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    caregiver = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='timesheet_entries',
        limit_choices_to={'role': 'caregiver'}
    )
    date = models.DateField()
    client = models.CharField(max_length=255)  # Client name
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_minutes = models.IntegerField(default=0)
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    rate = models.DecimalField(max_digits=8, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'start_time']
        indexes = [
            models.Index(fields=['caregiver', 'date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.caregiver.email} - {self.date} - {self.client}"

    def save(self, *args, **kwargs):
        # Auto-calculate hours and subtotal
        if self.start_time and self.end_time:
            from datetime import datetime, timedelta
            start = datetime.combine(datetime.today(), self.start_time)
            end = datetime.combine(datetime.today(), self.end_time)
            total_minutes = (end - start).total_seconds() / 60
            worked_minutes = total_minutes - self.break_minutes
            self.hours = round(worked_minutes / 60, 2)
            self.subtotal = round(self.hours * self.rate, 2)
        super().save(*args, **kwargs)
