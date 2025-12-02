from rest_framework import serializers
from .models import CareRequest, DoctorRequest


class CareRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for CareRequest model.
    Includes read-only email fields for related users.
    """
    patient_email = serializers.EmailField(source='patient.email', read_only=True)
    caregiver_email = serializers.EmailField(source='caregiver.email', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = CareRequest
        fields = [
            'id', 'family', 'service', 'duration', 'rate', 'unit', 'urgent', 'status', 'notes', 'created_at',
            'patient', 'caregiver', 'created_by', 'patient_email', 'caregiver_email', 'created_by_email'
        ]
        read_only_fields = ['status', 'created_at', 'created_by']


class DoctorRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for DoctorRequest model.
    Handles patient and doctor details including names and emails.
    """
    patient_email = serializers.EmailField(source='patient.email', read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_email = serializers.EmailField(source='doctor.email', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DoctorRequest
        fields = [
            'id', 'patient', 'doctor', 'reason', 'symptoms', 'preferred_date', 'preferred_time',
            'urgent', 'status', 'notes', 'doctor_notes', 'created_at', 'updated_at',
            'patient_email', 'patient_name', 'doctor_email', 'doctor_name'
        ]
        read_only_fields = ['patient', 'status', 'created_at', 'updated_at', 'doctor_notes']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email
    
    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() or obj.doctor.email
        return None
