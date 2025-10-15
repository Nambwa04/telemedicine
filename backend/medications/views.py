
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Medication, MedicationLog, ComplianceFollowUp
from .serializers import MedicationSerializer, MedicationLogSerializer, ComplianceFollowUpSerializer
from django.utils import timezone
from django.db.models import Prefetch
from .utils import compute_noncompliance_risk, next_followup_time, evaluate_and_create_followups_for_medications

class IsCaregiverOrPatientOrDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['caregiver', 'patient', 'doctor']

class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsCaregiverOrPatientOrDoctor]

    def perform_create(self, serializer):
        # Doctor, caregiver can create for any patient, patient for self
        user = self.request.user
        if user.role in ['caregiver', 'doctor']:
            # Get patient_id from validated data or raw request data
            patient_id = serializer.validated_data.get('patient_id') or self.request.data.get('patient_id')
            if not patient_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'patient_id': 'Caregiver/Doctor must specify patient_id'})
            from django.contrib.auth import get_user_model
            try:
                Patient = get_user_model().objects.get(id=patient_id, role='patient')
            except get_user_model().DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'patient_id': 'Patient with this ID does not exist.'})
            serializer.save(patient=Patient)
        else:
            serializer.save(patient=user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient=user)
        elif user.role in ['caregiver', 'doctor']:
            # Caregiver and doctor can see all
            return qs
        return qs.none()

    @action(detail=False, methods=['post', 'get'], url_path='prescriptions')
    def prescriptions(self, request):
        """
        Custom endpoint for prescriptions.
        POST: Create a new prescription (medication)
        GET: List all prescriptions
        """
        if request.method == 'POST':
            # Create a new prescription
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # List prescriptions
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='log-intake')
    def log_intake(self, request, pk=None):
        """
        Log that the patient took their medication
        POST /medications/{id}/log-intake/
        Body: { "doses_taken": 1, "notes": "optional" }
        """
        medication = self.get_object()
        
        # Only the patient or their caregiver can log intake
        if request.user.role == 'patient' and medication.patient != request.user:
            return Response(
                {'detail': 'You can only log intake for your own medications.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        doses_taken = request.data.get('doses_taken', 1)
        notes = request.data.get('notes', '')
        
        # Create log entry
        log = MedicationLog.objects.create(
            medication=medication,
            doses_taken=doses_taken,
            notes=notes
        )
        
        # Update remaining quantity
        medication.remaining_quantity = max(0, medication.remaining_quantity - doses_taken)
        medication.save()
        
        return Response({
            'message': 'Medication intake logged successfully',
            'log': MedicationLogSerializer(log).data,
            'remaining_quantity': medication.remaining_quantity,
            'needs_refill': medication.needs_refill
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='logs')
    def get_logs(self, request, pk=None):
        """
        Get medication logs for a specific medication
        GET /medications/{id}/logs/
        """
        medication = self.get_object()
        logs = medication.logs.all()
        serializer = MedicationLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='refill')
    def refill(self, request, pk=None):
        """
        Refill medication quantity
        POST /medications/{id}/refill/
        Body: { "quantity": 30 }
        """
        medication = self.get_object()
        
        # Only doctors and caregivers can refill
        if request.user.role not in ['doctor', 'caregiver']:
            return Response(
                {'detail': 'Only doctors and caregivers can refill medications.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        quantity = request.data.get('quantity')
        if not quantity or quantity <= 0:
            return Response(
                {'detail': 'Please provide a valid quantity.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        medication.remaining_quantity += quantity
        medication.total_quantity += quantity
        medication.save()
        
        return Response({
            'message': 'Medication refilled successfully',
            'remaining_quantity': medication.remaining_quantity,
            'total_quantity': medication.total_quantity
        })

    @action(detail=True, methods=['get'], url_path='risk')
    def risk(self, request, pk=None):
        """
        Get non-compliance risk score and level for a medication
        GET /medications/{id}/risk/
        """
        medication = self.get_object()
        score = compute_noncompliance_risk(medication)
        level = 'high' if score >= 0.7 else 'medium' if score >= 0.4 else 'low'
        return Response({'risk_score': round(score, 3), 'risk_level': level})

    @action(detail=False, methods=['get'], url_path='at-risk')
    def at_risk(self, request):
        """List medications with medium/high non-compliance risk for current viewer scope."""
        meds = self.get_queryset().select_related('patient')
        data = []
        for m in meds:
            score = compute_noncompliance_risk(m)
            if score >= 0.4:
                # Compose patient display name
                patient = m.patient
                patient_name = None
                try:
                    first = getattr(patient, 'first_name', '') or ''
                    last = getattr(patient, 'last_name', '') or ''
                    full = f"{first} {last}".strip()
                    patient_name = full if full else getattr(patient, 'email', None)
                except Exception:
                    patient_name = None
                data.append({
                    'id': m.id,
                    'patient': m.patient_id,
                    'patient_name': patient_name,
                    'name': m.name,
                    'risk_score': round(score, 3),
                    'risk_level': 'high' if score >= 0.7 else 'medium',
                    'remaining_quantity': m.remaining_quantity,
                    'total_quantity': m.total_quantity,
                    'refill_threshold': m.refill_threshold,
                })
        return Response(sorted(data, key=lambda x: x['risk_score'], reverse=True))

    @action(detail=False, methods=['post'], url_path='scan-and-followups')
    def scan_and_followups(self, request):
        """
        Scan all accessible medications and create follow-ups based on rules.
        POST /medications/scan-and-followups/
        """
        meds = self.get_queryset().select_related('patient')
        counts = evaluate_and_create_followups_for_medications(meds, created_by=request.user)
        return Response({'created': counts})

    @action(detail=True, methods=['post'], url_path='create-followup')
    def create_followup(self, request, pk=None):
        """Create a follow-up for this medication based on current risk or a provided reason."""
        medication = self.get_object()
        reason = request.data.get('reason', 'high_risk')
        notes = request.data.get('notes', '')
        score = compute_noncompliance_risk(medication)
        due = next_followup_time(score)
        follow = ComplianceFollowUp.objects.create(
            patient=medication.patient,
            medication=medication,
            due_at=due,
            status=ComplianceFollowUp.Status.PENDING,
            reason=reason,
            notes=notes,
            created_by=request.user,
            risk_score_snapshot=score,
        )
        return Response(ComplianceFollowUpSerializer(follow).data, status=status.HTTP_201_CREATED)


class ComplianceFollowUpViewSet(viewsets.ModelViewSet):
    queryset = ComplianceFollowUp.objects.select_related('patient', 'medication')
    serializer_class = ComplianceFollowUpSerializer
    permission_classes = [permissions.IsAuthenticated, IsCaregiverOrPatientOrDoctor]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient=user)
        elif user.role in ['caregiver', 'doctor']:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        f = self.get_object()
        f.status = ComplianceFollowUp.Status.COMPLETED
        f.completed_at = timezone.now()
        f.save(update_fields=['status', 'completed_at'])
        return Response(self.get_serializer(f).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        f = self.get_object()
        f.status = ComplianceFollowUp.Status.CANCELED
        f.completed_at = timezone.now()
        f.save(update_fields=['status', 'completed_at'])
        return Response(self.get_serializer(f).data)
