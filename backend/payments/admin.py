from django.contrib import admin
from .models import Payout


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'recipient_phone', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('recipient__email', 'recipient_phone', 'safaricom_conversation_id', 'originator_conversation_id')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    fieldsets = (
        (None, {'fields': ('recipient', 'recipient_phone', 'amount', 'status')}),
        ('Daraja', {'fields': ('command_id', 'remarks', 'safaricom_conversation_id', 'originator_conversation_id', 'result_code', 'result_desc', 'raw_callback')}),
    )
