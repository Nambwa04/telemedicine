from django.contrib import admin
from .models import Payout


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'recipient_phone', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('recipient__email', 'recipient_phone', 'safaricom_conversation_id', 'originator_conversation_id')
