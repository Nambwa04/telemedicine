from django.contrib import admin
from .models import Medication, MedicationLog, ComplianceFollowUp


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'patient', 'frequency', 'remaining_quantity', 'refill_threshold', 'start_date', 'end_date', 'created_at')
    list_filter = ('frequency', 'start_date', 'end_date', 'created_at')
    search_fields = ('name', 'patient__email', 'patient__username')


@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'medication', 'taken_at', 'doses_taken')
    list_filter = ('taken_at', 'doses_taken')
    search_fields = ('medication__name', 'medication__patient__email')


@admin.register(ComplianceFollowUp)
class ComplianceFollowUpAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'medication', 'reason', 'status', 'due_at', 'created_at', 'completed_at', 'risk_score_snapshot')
    list_filter = ('status', 'reason', 'due_at', 'created_at')
    search_fields = ('patient__email', 'medication__name')