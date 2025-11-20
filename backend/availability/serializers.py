from rest_framework import serializers
from .models import CaregiverAvailability, SpecificDateAvailability


class CaregiverAvailabilitySerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    day_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    
    class Meta:
        model = CaregiverAvailability
        fields = [
            'id', 'caregiver', 'caregiver_name', 'day_of_week', 'day_display',
            'start_time', 'end_time', 'is_available', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'caregiver', 'created_at', 'updated_at']
    
    def get_caregiver_name(self, obj):
        return f"{obj.caregiver.first_name} {obj.caregiver.last_name}".strip() or obj.caregiver.email
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['caregiver'] = request.user
        return super().create(validated_data)


class SpecificDateAvailabilitySerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    appointment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = SpecificDateAvailability
        fields = [
            'id', 'caregiver', 'caregiver_name', 'date',
            'start_time', 'end_time', 'is_available', 'reason', 'notes',
            'appointment', 'appointment_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'caregiver', 'created_at', 'updated_at']
    
    def get_caregiver_name(self, obj):
        return f"{obj.caregiver.first_name} {obj.caregiver.last_name}".strip() or obj.caregiver.email
    
    def get_appointment_details(self, obj):
        if not obj.appointment:
            return None
        return {
            'id': obj.appointment.id,
            'date': obj.appointment.date,
            'time': obj.appointment.time,
            'type': obj.appointment.type,
            'status': obj.appointment.status
        }
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['caregiver'] = request.user
        return super().create(validated_data)


class BulkAvailabilitySerializer(serializers.Serializer):
    """Serializer for bulk creating availability slots"""
    days = serializers.ListField(
        child=serializers.ChoiceField(choices=CaregiverAvailability.DAY_CHOICES)
    )
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError('End time must be after start time')
        return data
