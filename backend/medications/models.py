from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL

class Medication(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medications')
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    compliance = models.IntegerField(default=0)
    next_due = models.DateField(null=True, blank=True)
    
    # New fields for medication tracking
    total_quantity = models.IntegerField(default=0, help_text="Total quantity prescribed (e.g., 30 pills)")
    remaining_quantity = models.IntegerField(default=0, help_text="Quantity remaining")
    refill_threshold = models.IntegerField(default=7, help_text="Alert when this many doses remain")
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True, help_text="Expected end date of prescription")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.patient})"
    
    @property
    def needs_refill(self):
        """Check if medication is running low"""
        return self.remaining_quantity <= self.refill_threshold
    
    @property
    def is_depleted(self):
        """Check if medication is completely out"""
        return self.remaining_quantity <= 0


class MedicationLog(models.Model):
    """Track when patients take their medications"""
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='logs')
    taken_at = models.DateTimeField(default=timezone.now)
    doses_taken = models.IntegerField(default=1, help_text="Number of doses taken")
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-taken_at']
    
    def __str__(self):
        return f"{self.medication.name} - {self.taken_at.strftime('%Y-%m-%d %H:%M')}"


class ComplianceFollowUp(models.Model):
    """A follow-up task created when a patient is at risk of non-compliance, missing doses, or needs a refill."""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        CANCELED = 'canceled', 'Canceled'

    class Reason(models.TextChoices):
        LOW_COMPLIANCE = 'low_compliance', 'Low compliance'
        MISSED_DOSES = 'missed_doses', 'Missed doses'
        REFILL_NEEDED = 'refill_needed', 'Refill needed'
        NO_LOGS = 'no_logs', 'No recent logs'
        HIGH_RISK = 'high_risk', 'High non-compliance risk'

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_followups')
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='followups', null=True, blank=True)
    # Optional link to a scheduled meeting/appointment created for this follow-up
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='followups'
    )
    due_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reason = models.CharField(max_length=50, choices=Reason.choices)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_followups')
    completed_at = models.DateTimeField(null=True, blank=True)
    risk_score_snapshot = models.FloatField(null=True, blank=True, help_text="Risk score (0-1) at time of creation")

    class Meta:
        ordering = ['status', 'due_at']

    def __str__(self):
        med = f" for {self.medication.name}" if self.medication else ""
        return f"Follow-up({self.get_reason_display()}{med}) -> {self.get_status_display()} due {self.due_at:%Y-%m-%d %H:%M}"

