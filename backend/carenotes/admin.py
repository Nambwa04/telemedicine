from django.contrib import admin
from .models import CareNote, CareNoteComment, CareNoteRead


@admin.register(CareNote)
class CareNoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'author', 'note_type', 'priority', 'is_pinned', 'is_archived', 'created_at']
    list_filter = ['note_type', 'priority', 'is_pinned', 'is_archived', 'created_at']
    search_fields = ['title', 'content', 'patient__email', 'author__email']
    ordering = ['-is_pinned', '-created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CareNoteComment)
class CareNoteCommentAdmin(admin.ModelAdmin):
    list_display = ['note', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'author__email', 'note__title']
    ordering = ['-created_at']


@admin.register(CareNoteRead)
class CareNoteReadAdmin(admin.ModelAdmin):
    list_display = ['note', 'user', 'read_at']
    list_filter = ['read_at']
    search_fields = ['user__email', 'note__title']
    ordering = ['-read_at']
