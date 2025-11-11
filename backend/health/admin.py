from django.contrib import admin
from .models import VitalReading, SymptomLog, LabResult


@admin.register(VitalReading)
class VitalReadingAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "date", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "temperature", "created_at")
    list_filter = ("date", "patient")
    search_fields = ("patient__email",)
    ordering = ("-date",)
    date_hierarchy = "date"
    readonly_fields = ("created_at",)
    fieldsets = (
        (None, {"fields": ("patient", "date")}),
        ("Vitals", {"fields": ("blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "weight", "blood_sugar", "temperature")}),
        ("Notes", {"fields": ("notes",)}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(SymptomLog)
class SymptomLogAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "date", "symptom", "severity", "created_at")
    list_filter = ("date", "severity", "patient")
    search_fields = ("patient__email", "symptom")
    ordering = ("-date",)
    date_hierarchy = "date"
    readonly_fields = ("created_at",)
    fieldsets = (
        (None, {"fields": ("patient", "date", "symptom", "severity")}),
        ("Details", {"fields": ("duration", "notes")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "test", "value", "status", "date", "created_at")
    list_filter = ("status", "date", "patient")
    search_fields = ("patient__email", "test")
    ordering = ("-date",)
    date_hierarchy = "date"
    readonly_fields = ("created_at",)
    fieldsets = (
        (None, {"fields": ("patient", "test", "value", "range", "status")}),
        ("Schedule", {"fields": ("date",)}),
        ("Timestamps", {"fields": ("created_at",)}),
    )
