from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import date
from .models import Appointment
from .serializers import AppointmentSerializer

# ...existing code...

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_appointments(request):
    """
    Returns a list of today's appointments for the authenticated doctor.
    """
    user = request.user
    today = date.today()
    # Filter by doctor if your model has a doctor field, otherwise return all
    qs = Appointment.objects.filter(date=today)
    # If you want to filter by doctor:
    # qs = Appointment.objects.filter(date=today, doctor=user)
    serializer = AppointmentSerializer(qs, many=True)
    return Response(serializer.data)
from rest_framework import viewsets, permissions
from .models import Appointment
from .serializers import AppointmentSerializer
from .permissions import IsDoctorOrOwner

class IsParticipant(permissions.BasePermission):
    """
    Permission class to allow access only to participants (patient or doctor) or staff.
    """
    def has_object_permission(self, request, view, obj):
        return obj.patient == request.user or obj.doctor == request.user or request.user.is_staff

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing appointments.
    """
    # Schedule appointment (already handled by create)

    # Reschedule appointment
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update an appointment.
        Restricts rescheduling if the appointment is already completed or cancelled.
        """
        instance = self.get_object()
        # Only allow reschedule if status is scheduled or in-progress
        if instance.status not in ['scheduled', 'in-progress']:
            return Response({'detail': 'Cannot reschedule a completed or cancelled appointment.'}, status=400)
        return super().partial_update(request, *args, **kwargs)

    # Cancel appointment
    def cancel(self, request, pk=None):
        """
        Cancel an appointment.
        """
        appointment = self.get_object()
        if appointment.status == 'cancelled':
            return Response({'detail': 'Appointment already cancelled.'}, status=400)
        appointment.status = 'cancelled'
        appointment.save(update_fields=['status'])
        return Response({'detail': 'Appointment cancelled.'})

    # Join video consultation (returns video link)
    def join_video(self, request, pk=None):
        """
        Get the video link for an appointment.
        """
        appointment = self.get_object()
        if not appointment.video_link:
            return Response({'detail': 'No video link set for this appointment.'}, status=404)
        return Response({'video_link': appointment.video_link})

    from rest_framework.decorators import action
    @action(detail=True, methods=['post'])
    def cancel_appointment(self, request, pk=None):
        return self.cancel(request, pk)

    @action(detail=True, methods=['get'])
    def join_video(self, request, pk=None):
        return self.join_video(request, pk)
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrOwner]
    filterset_fields = ['date', 'status']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['date', 'time']

    def get_queryset(self):
        """
        Filter appointments by user role.
        Patients see their own appointments.
        Doctors see appointments for their assigned patients.
        """
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'patient':
            qs = qs.filter(patient=user)
        elif user.role == 'doctor':
            # Show only appointments for patients assigned to this doctor
            qs = qs.filter(patient__doctor=user)
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
        return qs

    def perform_create(self, serializer):
        # Expect patient_id & doctor_id provided; enforced by serializer fields already.
        serializer.save()
