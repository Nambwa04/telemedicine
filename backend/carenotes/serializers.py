from rest_framework import serializers
from .models import CareNote, CareNoteComment, CareNoteRead
from django.contrib.auth import get_user_model

User = get_user_model()


class CareNoteCommentSerializer(serializers.ModelSerializer):
    """
    Serializer for CareNoteComment model.
    """
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    
    class Meta:
        model = CareNoteComment
        fields = [
            'id', 'note', 'author', 'author_name', 'author_role',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        if not obj.author:
            return "Unknown"
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email


class CareNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for CareNote model.
    Includes nested comments and read status.
    """
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    patient_name = serializers.SerializerMethodField()
    comments = CareNoteCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = CareNote
        fields = [
            'id', 'patient', 'patient_name', 'author', 'author_name', 'author_role',
            'note_type', 'priority', 'title', 'content',
            'is_pinned', 'is_archived',
            'related_appointment', 'related_medication',
            'comments', 'comments_count', 'is_read',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        if not obj.author:
            return "Unknown"
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email
    
    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return CareNoteRead.objects.filter(note=obj, user=request.user).exists()
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['author'] = request.user
        return super().create(validated_data)

    def validate_patient(self, value):
        """Ensure the patient has the correct role"""
        if value.role != 'patient':
            raise serializers.ValidationError("Selected user must be a patient")
        return value