
from rest_framework import viewsets, permissions
from .models import Medication
from .serializers import MedicationSerializer

class IsCaregiverOrPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['caregiver', 'patient']

class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsCaregiverOrPatient]

    def perform_create(self, serializer):
        # Caregiver can create for any patient, patient for self
        user = self.request.user
        if user.role == 'caregiver':
            patient_id = self.request.data.get('patient_id')
            if not patient_id:
                raise Exception('Caregiver must specify patient_id')
            from django.contrib.auth import get_user_model
            Patient = get_user_model().objects.get(id=patient_id, role='patient')
            serializer.save(patient=Patient)
        else:
            serializer.save(patient=user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient=user)
        elif user.role == 'caregiver':
            # Caregiver can see all
            return qs
        return qs.none()
