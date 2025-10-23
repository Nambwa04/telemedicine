from django.db import models
from django.conf import settings
from django.utils import timezone


class Payout(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        TIMEOUT = 'TIMEOUT', 'Timeout'

    # who gets paid (typically a caregiver)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payouts'
    )
    recipient_phone = models.CharField(max_length=15)
    amount = models.PositiveIntegerField(help_text='Amount in KES')
    command_id = models.CharField(max_length=64, default='BusinessPayment')
    remarks = models.CharField(max_length=160, blank=True)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    safaricom_conversation_id = models.CharField(max_length=128, blank=True)
    originator_conversation_id = models.CharField(max_length=128, blank=True)
    result_code = models.CharField(max_length=16, blank=True)
    result_desc = models.CharField(max_length=255, blank=True)
    raw_callback = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payout #{self.id} -> {self.recipient_phone} KES {self.amount} [{self.status}]"
