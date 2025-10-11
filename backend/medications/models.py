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

