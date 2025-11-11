from django.contrib import admin
from .models import TimesheetEntry


@admin.register(TimesheetEntry)
class TimesheetEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "caregiver", "date", "client", "start_time", "end_time", "hours", "rate", "subtotal", "status")
    list_filter = ("status", "date", "caregiver")
    search_fields = ("caregiver__email", "client")
    ordering = ("-date", "start_time")
    date_hierarchy = "date"

    fieldsets = (
        (None, {"fields": ("caregiver", "date", "client", "status")}),
        ("Time", {"fields": ("start_time", "end_time", "break_minutes", "hours")}),
        ("Rate & Totals", {"fields": ("rate", "subtotal")}),
        ("Notes", {"fields": ("notes",)}),
    )
