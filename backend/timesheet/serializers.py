from rest_framework import serializers
from .models import TimesheetEntry


class TimesheetEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for TimesheetEntry model.
    Handles creation and validation of timesheet entries.
    """
    caregiver_name = serializers.SerializerMethodField()

    class Meta:
        model = TimesheetEntry
        fields = [
            'id', 'caregiver', 'caregiver_name', 'date', 'client',
            'start_time', 'end_time', 'break_minutes', 'hours',
            'rate', 'subtotal', 'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'caregiver', 'hours', 'subtotal', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'caregiver': {'required': False},
            'start_time': {'required': False, 'allow_null': True},
            'end_time': {'required': False, 'allow_null': True},
        }

    def get_caregiver_name(self, obj):
        return f"{obj.caregiver.first_name} {obj.caregiver.last_name}".strip() or obj.caregiver.email

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and not validated_data.get('caregiver'):
            validated_data['caregiver'] = request.user
        return super().create(validated_data)
