from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class TimesheetEntry(models.Model):
    STATUS_CHOICES = [
        ('in-progress', 'In Progress'),
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
    client = models.CharField(max_length=255)
    # Allow null start/end for clock-in workflow until clock-out completes.
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    break_minutes = models.IntegerField(default=0)
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
        # Calculate hours/subtotal only when both times are present.
        from decimal import Decimal, ROUND_HALF_UP
        from datetime import datetime
        if self.start_time and self.end_time:
            start = datetime.combine(datetime.today(), self.start_time)
            end = datetime.combine(datetime.today(), self.end_time)
            if end < start:
                # Simple safeguard: treat overnight as same-day end for now.
                end = start
            total_minutes = Decimal((end - start).total_seconds()) / Decimal(60)
            worked_minutes = max(Decimal(0), total_minutes - Decimal(self.break_minutes))
            hours = (worked_minutes / Decimal(60)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.hours = hours
            self.subtotal = (hours * Decimal(self.rate)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)

    def clock_in(self, rate=0, client="", notes=""):
        """Initialize an in-progress entry with current time."""
        from datetime import datetime
        now = datetime.now()
        self.date = now.date()
        self.start_time = now.time().replace(second=0, microsecond=0)
        self.end_time = None
        self.status = 'in-progress'
        if rate:
            self.rate = rate
        if client:
            self.client = client
        if notes:
            self.notes = notes
        self.save()

    def clock_out(self):
        """Finalize an in-progress entry by setting end_time and moving to draft."""
        from datetime import datetime
        if self.status != 'in-progress':
            return
        now = datetime.now()
        self.end_time = now.time().replace(second=0, microsecond=0)
        self.status = 'draft'
        self.save()
