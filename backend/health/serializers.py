from rest_framework import serializers
from .models import VitalReading, SymptomLog, LabResult

class VitalReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalReading
        fields = '__all__'
        read_only_fields = ['patient']

class SymptomLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomLog
        fields = '__all__'
        read_only_fields = ['patient']

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = '__all__'
        read_only_fields = ['patient']
