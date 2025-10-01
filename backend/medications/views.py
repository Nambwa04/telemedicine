from rest_framework import viewsets
from .models import Medication
from .serializers import MedicationSerializer

class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            return qs.filter(patient=user)
        return qs
