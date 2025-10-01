from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import VitalReading, SymptomLog, LabResult
from .serializers import VitalReadingSerializer, SymptomLogSerializer, LabResultSerializer
from medications.models import Medication
from appointments.models import Appointment

class PatientOwnedMixin:
    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient=user)
        return qs

class VitalReadingViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    queryset = VitalReading.objects.all()
    serializer_class = VitalReadingSerializer

class SymptomLogViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    queryset = SymptomLog.objects.all()
    serializer_class = SymptomLogSerializer

class LabResultViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer


class HealthOverviewViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        user = request.user
        if user.role != 'patient':
            # For now allow doctors to pass ?patient_id= to view a patient summary
            patient_id = request.query_params.get('patient_id')
            if patient_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    user = User.objects.get(id=patient_id, role='patient')
                except User.DoesNotExist:
                    return Response({'detail': 'Patient not found'}, status=404)
        vitals_qs = VitalReading.objects.filter(patient=user).order_by('-date')[:5]
        labs_qs = LabResult.objects.filter(patient=user).order_by('-date')[:5]
        symptoms_qs = SymptomLog.objects.filter(patient=user).order_by('-date')[:5]
        meds_qs = Medication.objects.filter(patient=user)
        upcoming_appts = Appointment.objects.filter(patient=user, date__gte=timezone.now().date()).order_by('date', 'time')[:5]

        # Simple latest metrics extraction
        latest_vital = vitals_qs[0] if vitals_qs else None
        overview = {
            'bloodPressure': {
                'current': f"{latest_vital.blood_pressure_systolic}/{latest_vital.blood_pressure_diastolic}" if latest_vital else None,
                'trend': 'stable',
                'lastReading': latest_vital.date.isoformat() if latest_vital else None
            },
            'heartRate': {
                'current': latest_vital.heart_rate if latest_vital else None,
                'trend': 'normal',
                'lastReading': latest_vital.date.isoformat() if latest_vital else None
            },
            'weight': {
                'current': latest_vital.weight if latest_vital else None,
                'trend': 'stable',
                'lastReading': latest_vital.date.isoformat() if latest_vital else None
            },
            'bloodSugar': {
                'current': latest_vital.blood_sugar if latest_vital else None,
                'trend': 'stable',
                'lastReading': latest_vital.date.isoformat() if latest_vital else None
            }
        }
        data = {
            'patientId': user.id,
            'overview': overview,
            'vitals': VitalReadingSerializer(vitals_qs, many=True).data,
            'labResults': LabResultSerializer(labs_qs, many=True).data,
            'symptoms': SymptomLogSerializer(symptoms_qs, many=True).data,
            'medications': [
                {
                    'name': m.name,
                    'dosage': m.dosage,
                    'frequency': m.frequency,
                    'compliance': m.compliance,
                    'nextDue': m.next_due.isoformat() if m.next_due else None
                } for m in meds_qs
            ],
            'appointments': [
                {
                    'date': a.date.isoformat(),
                    'doctor': str(a.doctor),
                    'type': a.type,
                    'notes': a.notes
                } for a in upcoming_appts
            ]
        }
        return Response(data)
