from rest_framework import serializers
from .models import Appointment
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'first_name', 'last_name']

class AppointmentSerializer(serializers.ModelSerializer):
    patient = UserSimpleSerializer(read_only=True)
    doctor = UserSimpleSerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='patient'), source='patient', write_only=True)
    doctor_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='doctor'), source='doctor', write_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'date', 'time', 'type', 'notes', 'status', 'patient', 'doctor', 'patient_id', 'doctor_id']
