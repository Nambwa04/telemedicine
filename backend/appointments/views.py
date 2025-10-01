from rest_framework import viewsets, permissions
from .models import Appointment
from .serializers import AppointmentSerializer
from .permissions import IsDoctorOrOwner

class IsParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.patient == request.user or obj.doctor == request.user or request.user.is_staff

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrOwner]
    filterset_fields = ['date', 'status']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['date', 'time']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            qs = qs.filter(patient=user)
        elif user.role == 'doctor':
            qs = qs.filter(doctor=user)
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
        return qs

    def perform_create(self, serializer):
        # Expect patient_id & doctor_id provided; enforced by serializer fields already.
        serializer.save()
