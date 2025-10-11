
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Medication, MedicationLog
from .serializers import MedicationSerializer, MedicationLogSerializer
from django.utils import timezone

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
