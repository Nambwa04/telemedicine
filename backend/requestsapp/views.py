from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import CareRequest, DoctorRequest
from .serializers import CareRequestSerializer, DoctorRequestSerializer


class IsCareRequestPermission(permissions.BasePermission):
    """Custom permission:
    - SAFE (GET/HEAD/OPTIONS): allow any (DRF will still enforce auth via view permission_classes)
    - POST: patient, caregiver, doctor, admin can create a request
    - Other write methods (PUT/PATCH/DELETE): limited to caregiver/doctor/admin (patients cannot modify after creation yet)
    (Future enhancement: add object-level checks tying request to patient.)
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.method == 'POST':
            return request.user.is_authenticated and request.user.role in ['patient', 'caregiver', 'doctor', 'admin']
        # For updates/deletes restrict to caregiver/doctor/admin only
        return request.user.is_authenticated and request.user.role in ['caregiver', 'doctor', 'admin']


class CareRequestViewSet(viewsets.ModelViewSet):
    queryset = CareRequest.objects.all()
    serializer_class = CareRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsCareRequestPermission]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        # Role-based visibility
        if user.role == 'patient':
            return qs.filter(models.Q(patient=user) | models.Q(created_by=user))
        if user.role == 'caregiver':
            return qs.filter(models.Q(caregiver=user) | models.Q(status='new'))
        # doctors/admins see all
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        patient = None
        caregiver = None
        # If a patient creates, they're the patient.
        if user.role == 'patient':
            patient = user
        # If caregiver submits (e.g., self-initiated offering) set caregiver.
        if user.role == 'caregiver':
            caregiver = user
        serializer.save(created_by=user, patient=patient, caregiver=caregiver)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        ordering = self.request.query_params.get('ordering')
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Caregiver (or doctor/admin) accepts a NEW care request.
        Rules:
        - Request must currently be 'new'.
        - Acting user must have role caregiver/doctor/admin.
        - If caregiver role, they become the assigned caregiver.
        - If doctor/admin and caregiver already set, just transition status.
        """
        care_request = self.get_object()
        user = request.user
        if care_request.status != 'new':
            return Response({'detail': 'Only NEW requests can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['caregiver', 'doctor', 'admin']:
            return Response({'detail': 'You do not have permission to accept this request.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'caregiver':
            care_request.caregiver = user
        care_request.status = 'accepted'
        care_request.save(update_fields=['caregiver', 'status'])
        return Response(CareRequestSerializer(care_request, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='decline')
    def decline(self, request, pk=None):
        """Caregiver (or doctor/admin) declines a care request.
        Rules:
        - Request must be in 'new' or 'accepted'.
        - Acting user must have role caregiver/doctor/admin.
        - Declining sets status to 'declined'.
        - If acting caregiver was previously assigned (accepted), keep caregiver for audit.
        """
        care_request = self.get_object()
        user = request.user
        if care_request.status not in ['new', 'accepted']:
            return Response({'detail': 'Only NEW or ACCEPTED requests can be declined.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['caregiver', 'doctor', 'admin']:
            return Response({'detail': 'You do not have permission to decline this request.'}, status=status.HTTP_403_FORBIDDEN)
        care_request.status = 'declined'
        care_request.save(update_fields=['status'])
        return Response(CareRequestSerializer(care_request, context={'request': request}).data)


class IsDoctorRequestPermission(permissions.BasePermission):
    """Custom permission for doctor requests:
    - SAFE methods (GET): authenticated users can view
    - POST (create): only patients can create requests
    - PUT/PATCH: only request owners can update
    - DELETE: only request owners or admins can delete
    - Custom actions (accept/decline): handled at action level
    """
    def has_permission(self, request, view):
        # Allow authenticated users for safe methods
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Create requests: only patients
        if view.action == 'create':
            return request.user.is_authenticated and request.user.role == 'patient'
        
        # For custom actions (accept, decline), allow all authenticated users
        # We'll do specific checks in has_object_permission
        if view.action in ['accept', 'decline']:
            return request.user.is_authenticated
        
        # For other actions, require authentication
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Safe methods: allow if user is patient (owns request) or doctor (target of request)
        if request.method in permissions.SAFE_METHODS:
            return (obj.patient == request.user or 
                    obj.doctor == request.user or 
                    request.user.role == 'admin')
        
        # Update/delete: only patient who created the request
        if view.action in ['update', 'partial_update', 'destroy']:
            return obj.patient == request.user or request.user.role == 'admin'
        
        # Accept/Decline actions: only doctors
        if view.action in ['accept', 'decline']:
            return request.user.role == 'doctor'
        
        return False


class DoctorRequestViewSet(viewsets.ModelViewSet):
    queryset = DoctorRequest.objects.all()
    serializer_class = DoctorRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorRequestPermission]
    
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        
        # Patients see only their own requests
        if user.role == 'patient':
            return qs.filter(patient=user)
        
        # Doctors see requests assigned to them or new unassigned requests
        if user.role == 'doctor':
            return qs.filter(models.Q(doctor=user) | models.Q(status='new'))
        
        # Admins see all
        return qs
    
    def perform_create(self, serializer):
        # Patient creates request - automatically set patient to current user
        serializer.save(patient=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Override create to add better error logging"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating doctor request: {e}")
            print(f"Request data: {request.data}")
            raise
    
    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Doctor accepts a patient's request to be their doctor.
        Rules:
        - Request must be 'new'
        - Acting user must be a doctor
        - Doctor becomes assigned to the patient
        """
        doctor_request = self.get_object()
        user = request.user
        
        # Debug logging
        print(f"Accept request - Current status: {doctor_request.status}")
        print(f"Request ID: {doctor_request.id}, Patient: {doctor_request.patient.email}")
        
        if doctor_request.status != 'new':
            return Response(
                {'detail': f'Only NEW requests can be accepted. Current status: {doctor_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.role != 'doctor':
            return Response(
                {'detail': 'Only doctors can accept assignment requests.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Assign doctor and update status
        doctor_request.doctor = user
        doctor_request.status = 'accepted'
        doctor_request.save(update_fields=['doctor', 'status'])
        
        # CRITICAL: Assign the doctor to the patient for permanent assignment
        patient = doctor_request.patient
        patient.doctor = user
        patient.save(update_fields=['doctor'])
        
        return Response(DoctorRequestSerializer(doctor_request, context={'request': request}).data)
    
    @action(detail=True, methods=['post'], url_path='decline')
    def decline(self, request, pk=None):
        """Doctor declines a patient's assignment request.
        Rules:
        - Request must be 'new' or 'accepted'
        - Acting user must be a doctor
        """
        doctor_request = self.get_object()
        user = request.user
        
        if doctor_request.status not in ['new', 'accepted']:
            return Response(
                {'detail': 'Only NEW or ACCEPTED requests can be declined.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.role != 'doctor':
            return Response(
                {'detail': 'Only doctors can decline assignment requests.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        doctor_request.status = 'declined'
        doctor_request.save(update_fields=['status'])
        
        return Response(DoctorRequestSerializer(doctor_request, context={'request': request}).data)
