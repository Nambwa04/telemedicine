from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor", "date", "time", "type", "status", "created_at")
    list_filter = ("status", "date", "doctor")
    search_fields = ("patient__email", "doctor__email", "type")
    ordering = ("-date", "time")
    date_hierarchy = "date"
    readonly_fields = ("created_at",)

    fieldsets = (
        (None, {"fields": ("patient", "doctor", "date", "time", "type", "status", "video_link")}),
        ("Details", {"fields": ("notes",)}),
        ("Timestamps", {"fields": ("created_at",)}),
    )
