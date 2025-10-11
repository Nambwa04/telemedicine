from rest_framework import serializers
from .models import Medication, MedicationLog
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

class MedicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLog
        fields = ['id', 'medication', 'taken_at', 'doses_taken', 'notes']
        read_only_fields = ['id']


class MedicationSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(write_only=True, required=False)
    needs_refill = serializers.ReadOnlyField()
    is_depleted = serializers.ReadOnlyField()
    recent_logs = serializers.SerializerMethodField()
    compliance_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Medication
        fields = [
            'id', 'patient', 'patient_id', 'name', 'dosage', 'frequency', 
            'compliance', 'next_due', 'total_quantity', 'remaining_quantity',
            'refill_threshold', 'start_date', 'end_date', 'created_at',
            'needs_refill', 'is_depleted', 'recent_logs', 'compliance_rate'
        ]
        read_only_fields = ['patient', 'id', 'created_at', 'needs_refill', 'is_depleted']
    
    def get_recent_logs(self, obj):
        """Get last 5 medication logs"""
        logs = obj.logs.all()[:5]
        return MedicationLogSerializer(logs, many=True).data
    
    def get_compliance_rate(self, obj):
        """Calculate compliance rate based on logs in last 30 days"""
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Parse frequency to determine expected doses per day
        frequency_lower = obj.frequency.lower()
        if 'once' in frequency_lower or '1' in frequency_lower:
            expected_per_day = 1
        elif 'twice' in frequency_lower or '2' in frequency_lower:
            expected_per_day = 2
        elif 'three' in frequency_lower or '3' in frequency_lower:
            expected_per_day = 3
        elif 'four' in frequency_lower or '4' in frequency_lower:
            expected_per_day = 4
        else:
            expected_per_day = 1  # default
        
        # Calculate days since start (max 30)
        days_on_medication = min((timezone.now().date() - obj.start_date).days, 30)
        if days_on_medication <= 0:
            return 100  # Just started
        
        expected_doses = days_on_medication * expected_per_day
        actual_logs = obj.logs.filter(taken_at__gte=thirty_days_ago).count()
        
        if expected_doses == 0:
            return 100
        
        compliance_rate = min((actual_logs / expected_doses) * 100, 100)
        return round(compliance_rate, 1)

