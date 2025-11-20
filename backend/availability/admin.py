from django.contrib import admin
from .models import CaregiverAvailability, SpecificDateAvailability


@admin.register(CaregiverAvailability)
class CaregiverAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['caregiver', 'day_of_week', 'start_time', 'end_time', 'is_available', 'updated_at']
    list_filter = ['day_of_week', 'is_available', 'caregiver']
    search_fields = ['caregiver__email', 'caregiver__first_name', 'caregiver__last_name']
    ordering = ['caregiver', 'day_of_week', 'start_time']


@admin.register(SpecificDateAvailability)
class SpecificDateAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['caregiver', 'date', 'start_time', 'end_time', 'is_available', 'reason', 'appointment']
    list_filter = ['is_available', 'date', 'caregiver']
    search_fields = ['caregiver__email', 'caregiver__first_name', 'caregiver__last_name', 'reason']
    ordering = ['date', 'start_time']
