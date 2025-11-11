from django.contrib import admin
from .models import CareRequest, DoctorRequest


@admin.register(CareRequest)
class CareRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "family", "service", "duration", "rate", "unit", "urgent", "status", "patient", "caregiver", "created_at")
    list_filter = ("status", "urgent", "created_at")
    search_fields = ("family", "service", "patient__email", "caregiver__email")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("family", "service", "duration", "rate", "unit", "urgent")}),
        ("Relations", {"fields": ("patient", "caregiver", "created_by")}),
        ("Status", {"fields": ("status", "notes")}),
    )


@admin.register(DoctorRequest)
class DoctorRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor", "urgent", "status", "preferred_date", "preferred_time", "created_at")
    list_filter = ("status", "urgent", "created_at")
    search_fields = ("patient__email", "doctor__email")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("patient", "doctor", "urgent", "status")}),
        ("Preferences", {"fields": ("preferred_date", "preferred_time")}),
        ("Details", {"fields": ("reason", "symptoms", "notes", "doctor_notes")}),
    )
