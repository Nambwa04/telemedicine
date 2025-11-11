from django.contrib import admin
from .models import User, EmailVerificationToken, PasswordResetToken, VerificationDocument


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "role", "is_active", "is_staff", "is_superuser", "is_verified")
    list_filter = ("role", "is_active", "is_staff", "is_superuser", "is_verified")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-date_joined",)
    date_hierarchy = "date_joined"
    readonly_fields = ("last_login", "date_joined", "location_updated_at")

    fieldsets = (
        ("Account", {
            "fields": ("email", "username", "password", "role", "is_active", "is_staff", "is_superuser", "is_verified")
        }),
        ("Personal info", {
            "fields": ("first_name", "last_name", "phone", "date_of_birth", "gender", "address", "emergency_contact")
        }),
        ("Professional", {
            "fields": ("doctor", "experience_years", "specializations", "hourly_rate", "bio")
        }),
        ("Location", {
            "fields": ("latitude", "longitude", "location_updated_at")
        }),
        ("Permissions", {
            "fields": ("groups", "user_permissions")
        }),
        ("Important dates", {
            "fields": ("last_login", "date_joined")
        }),
    )


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "token", "used", "created_at")
    list_filter = ("used", "created_at")
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("token", "created_at")

    fieldsets = (
        (None, {"fields": ("user", "token", "used")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "token", "used", "created_at")
    list_filter = ("used", "created_at")
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("token", "created_at")

    fieldsets = (
        (None, {"fields": ("user", "token", "used")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "doc_type", "status", "uploaded_at", "reviewed_by", "reviewed_at")
    list_filter = ("status", "uploaded_at")
    search_fields = ("user__email", "doc_type")
    ordering = ("-uploaded_at",)
    date_hierarchy = "uploaded_at"
    readonly_fields = ("uploaded_at", "reviewed_at")

    fieldsets = (
        (None, {"fields": ("user", "file", "doc_type", "note")}),
        ("Review", {"fields": ("status", "review_note", "reviewed_by", "reviewed_at")}),
        ("Timestamps", {"fields": ("uploaded_at",)}),
    )
