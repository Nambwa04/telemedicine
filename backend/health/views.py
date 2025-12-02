from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework import serializers as drf_serializers
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import LabResult
from .serializers import LabResultSerializer
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import VitalReading, SymptomLog, LabResult
from .serializers import VitalReadingSerializer, SymptomLogSerializer, LabResultSerializer
from medications.models import Medication
from appointments.models import Appointment


# LabResultUploadView: Handles file uploads for lab results
class LabResultUploadView(APIView):
    """
    Endpoint for uploading lab result files.
    Parses date and creates a LabResult record.
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Expecting: file, patient_id, uploaded_by, upload_date
        import datetime
        file = request.FILES.get('file')
        patient_id = request.data.get('patient_id')
        test = request.data.get('test', 'Lab Result')
        value = request.data.get('value', '')
        range_ = request.data.get('range', '')
        status_ = request.data.get('status', 'pending')
        date = request.data.get('upload_date')
        if not patient_id:
            return Response({'detail': 'patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        User = get_user_model()
        try:
            patient = User.objects.get(id=patient_id, role='patient')
        except User.DoesNotExist:
            return Response({'detail': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        date_obj = None
        if date:
            try:
                # Try to parse as full ISO datetime first
                date_obj = datetime.datetime.fromisoformat(date.replace('Z', '+00:00')).date()
            except Exception:
                try:
                    # Try to parse as YYYY-MM-DD
                    date_obj = datetime.datetime.strptime(date, '%Y-%m-%d').date()
                except Exception:
                    return Response({'detail': 'Invalid date format. Use YYYY-MM-DD or ISO format.'}, status=status.HTTP_400_BAD_REQUEST)
        # For demo: just save file name and meta, not file content
        lab_result = LabResult.objects.create(
            patient=patient,
            test=test,
            value=file.name if file else value,
            range=range_,
            status=status_,
            date=date_obj
        )
        return Response(LabResultSerializer(lab_result).data, status=status.HTTP_201_CREATED)


# Mixin to automatically set patient field to current user
class PatientOwnedMixin:
    """
    Mixin to handle patient ownership of records.
    - Patients can only access/create their own records.
    - Doctors/Caregivers can access/create records for specified patients.
    """
    def perform_create(self, serializer):
        """Assign the patient for created records.
        - If the requester is a patient, always assign to themselves.
        - If the requester is a doctor or caregiver (or staff), allow passing `patient_id` (or `patient`) in the request body.
        """
        user = self.request.user
        # Patients can only create for themselves
        if getattr(user, 'role', None) == 'patient':
            return serializer.save(patient=user)

        # Non-patients must specify which patient the record belongs to
        patient_id = self.request.data.get('patient_id') or self.request.data.get('patient')
        if not patient_id:
            raise drf_serializers.ValidationError({'patient_id': 'This field is required for non-patient users.'})

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            patient = User.objects.get(id=patient_id, role='patient')
        except User.DoesNotExist:
            raise drf_serializers.ValidationError({'patient_id': 'Patient not found.'})

        return serializer.save(patient=patient)

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'patient':
            return self.queryset.filter(patient=user)
        # For doctors/caregivers, allow querying by patient_id
        patient_id = self.request.query_params.get('patient_id') or self.request.query_params.get('patient')
        if patient_id:
            return self.queryset.filter(patient_id=patient_id)
        # Default: show nothing for non-patients if no patient specified
        return self.queryset.none()


class VitalReadingViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing vital readings.
    """
    queryset = VitalReading.objects.all()
    serializer_class = VitalReadingSerializer
    permission_classes = [permissions.IsAuthenticated]


class SymptomLogViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing symptom logs.
    """
    queryset = SymptomLog.objects.all()
    serializer_class = SymptomLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        print('DEBUG: Incoming symptom POST data:', request.data)
        response = super().create(request, *args, **kwargs)
        if response.status_code == 400:
            print('DEBUG: Symptom serializer errors:', response.data)
        return response


class LabResultViewSet(PatientOwnedMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing lab results.
    """
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]


class HealthOverviewViewSet(viewsets.ViewSet):
    """
    ViewSet for retrieving a comprehensive health overview for a patient.
    Includes vitals, lab results, symptoms, medications, and upcoming appointments.
    Also computes risk trends for vitals.
    """
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
                    return Response({'detail': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'detail': 'patient_id is required for non-patient users'}, status=status.HTTP_400_BAD_REQUEST)
    
        # Get recent data for the patient (works for both patient and non-patient users)
        vitals_qs = VitalReading.objects.filter(patient=user).order_by('-date', '-created_at')[:5]
        current_vital = vitals_qs.first() if vitals_qs else None
        previous_vital = vitals_qs[1] if vitals_qs and len(vitals_qs) > 1 else None
        
        labs_qs = LabResult.objects.filter(patient=user).order_by('-date')[:5]
        symptoms_qs = SymptomLog.objects.filter(patient=user).order_by('-date')[:5]
        meds_qs = Medication.objects.filter(patient=user)
        upcoming_appts = Appointment.objects.filter(patient=user, date__gte=timezone.now().date()).order_by('date', 'time')[:5]

        # Risk analysis functions
        def bp_risk(s, d):
            if s is None or d is None:
                return 'unknown'
            if s >= 180 or d >= 120:
                return 'abnormally high'
            if s >= 140 or d >= 90:
                return 'abnormally high'
            if s < 90 or d < 60:
                return 'abnormally low'
            return 'normal'

        def hr_risk(hr):
            if hr is None:
                return 'unknown'
            if hr < 40:
                return 'abnormally low'
            if hr > 130:
                return 'abnormally high'
            if hr < 60:
                return 'abnormally low'
            if hr > 100:
                return 'abnormally high'
            return 'normal'

        def temp_risk(temp):
            if temp is None:
                return 'unknown'
            if temp >= 39.5:
                return 'abnormally high'
            if temp <= 34:
                return 'abnormally low'
            if temp >= 38:
                return 'abnormally high'
            if temp < 36:
                return 'abnormally low'
            return 'normal'

        def sugar_risk(sugar):
            if sugar is None:
                return 'unknown'
            if sugar < 54:
                return 'abnormally low'
            if sugar > 400:
                return 'abnormally high'
            if sugar < 70:
                return 'abnormally low'
            if sugar > 180:
                return 'abnormally high'
            return 'normal'

        def weight_risk(weight):
            if weight is None:
                return 'unknown'
            if weight < 40:
                return 'abnormally low'
            if weight > 200:
                return 'abnormally high'
            if weight < 50:
                return 'abnormally low'
            if weight > 150:
                return 'abnormally high'
            return 'normal'
        # Compute risk for each vital
        bp_s = current_vital.blood_pressure_systolic if current_vital else None
        bp_d = current_vital.blood_pressure_diastolic if current_vital else None
        bp_trend = bp_risk(bp_s, bp_d)
        hr_trend = hr_risk(current_vital.heart_rate if current_vital else None)
        temp_trend = temp_risk(current_vital.temperature if current_vital else None)
        sugar_trend = sugar_risk(current_vital.blood_sugar if current_vital else None)
        weight_trend = weight_risk(current_vital.weight if current_vital else None)

        overview = {
            'bloodPressure': {
                'current': f"{bp_s}/{bp_d}" if (bp_s is not None and bp_d is not None) else None,
                'previous': f"{previous_vital.blood_pressure_systolic}/{previous_vital.blood_pressure_diastolic}" if (previous_vital and previous_vital.blood_pressure_systolic is not None and previous_vital.blood_pressure_diastolic is not None) else None,
                'trend': bp_trend,
                'lastRecorded': current_vital.date.isoformat() if current_vital else None
            },
            'heartRate': {
                'current': current_vital.heart_rate if (current_vital and current_vital.heart_rate is not None) else None,
                'previous': previous_vital.heart_rate if (previous_vital and previous_vital.heart_rate is not None) else None,
                'trend': hr_trend,
                'lastRecorded': current_vital.date.isoformat() if current_vital else None
            },
            'weight': {
                'current': current_vital.weight if (current_vital and current_vital.weight is not None) else None,
                'previous': previous_vital.weight if (previous_vital and previous_vital.weight is not None) else None,
                'trend': weight_trend,
                'lastRecorded': current_vital.date.isoformat() if current_vital else None
            },
            'bloodSugar': {
                'current': current_vital.blood_sugar if (current_vital and current_vital.blood_sugar is not None) else None,
                'previous': previous_vital.blood_sugar if (previous_vital and previous_vital.blood_sugar is not None) else None,
                'trend': sugar_trend,
                'lastRecorded': current_vital.date.isoformat() if current_vital else None
            },
            'temperature': {
                'current': current_vital.temperature if (current_vital and current_vital.temperature is not None) else None,
                'previous': previous_vital.temperature if (previous_vital and previous_vital.temperature is not None) else None,
                'trend': temp_trend,
                'lastRecorded': current_vital.date.isoformat() if current_vital else None
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
