from django.contrib import admin
from .models import Medication, MedicationLog, ComplianceFollowUp


class MedicationLogInline(admin.TabularInline):
    model = MedicationLog
    extra = 0
    fields = ('taken_at', 'doses_taken', 'notes')
    ordering = ('-taken_at',)


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'patient', 'frequency', 'remaining_quantity', 'refill_threshold', 'start_date', 'end_date', 'created_at')
    list_filter = ('frequency', 'start_date', 'end_date', 'created_at')
    search_fields = ('name', 'patient__email', 'patient__username')
    ordering = ('-start_date',)
    date_hierarchy = 'start_date'
    inlines = [MedicationLogInline]

    fieldsets = (
        (None, {'fields': ('patient', 'name', 'dosage', 'frequency')}),
        ('Tracking', {'fields': ('total_quantity', 'remaining_quantity', 'refill_threshold', 'start_date', 'end_date')}),
        ('Compliance', {'fields': ('compliance', 'next_due')}),
    )


@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'medication', 'taken_at', 'doses_taken')
    list_filter = ('taken_at', 'doses_taken')
    search_fields = ('medication__name', 'medication__patient__email')
    ordering = ('-taken_at',)
    date_hierarchy = 'taken_at'


@admin.register(ComplianceFollowUp)
class ComplianceFollowUpAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'medication', 'reason', 'status', 'due_at', 'created_at', 'completed_at', 'risk_score_snapshot')
    list_filter = ('status', 'reason', 'due_at', 'created_at')
    search_fields = ('patient__email', 'medication__name')
    ordering = ('status', '-due_at')
    date_hierarchy = 'due_at'
    fieldsets = (
        (None, {'fields': ('patient', 'medication', 'reason', 'status')}),
        ('Schedule', {'fields': ('due_at', 'completed_at')}),
        ('Details', {'fields': ('notes', 'risk_score_snapshot', 'appointment', 'created_by')}),
    )