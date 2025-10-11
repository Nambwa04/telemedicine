from rest_framework import serializers
from .models import VitalReading, SymptomLog, LabResult

class VitalReadingSerializer(serializers.ModelSerializer):
    bloodPressure = serializers.SerializerMethodField()
    heartRate = serializers.IntegerField(source='heart_rate', allow_null=True, required=False)
    
    class Meta:
        model = VitalReading
        fields = ['id', 'patient', 'date', 'blood_pressure_systolic', 'blood_pressure_diastolic', 
                  'heart_rate', 'weight', 'blood_sugar', 'temperature', 'notes', 'created_at',
                  'bloodPressure', 'heartRate']
        read_only_fields = ['patient', 'created_at']
        extra_kwargs = {
            'blood_pressure_systolic': {'required': False, 'allow_null': True},
            'blood_pressure_diastolic': {'required': False, 'allow_null': True},
            'heart_rate': {'required': False, 'allow_null': True},
            'weight': {'required': False, 'allow_null': True},
            'blood_sugar': {'required': False, 'allow_null': True},
            'temperature': {'required': False, 'allow_null': True},
            'notes': {'required': False, 'allow_blank': True},
        }
    
    def get_bloodPressure(self, obj):
        """Combine systolic and diastolic for chart display"""
        if obj.blood_pressure_systolic and obj.blood_pressure_diastolic:
            # Return the systolic value for the chart (or average)
            return obj.blood_pressure_systolic
        return None

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
