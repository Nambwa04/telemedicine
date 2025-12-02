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
    """
    ViewSet for managing care requests.
    Handles creation, listing, and status transitions (accept, start, complete, decline).
    """
    queryset = CareRequest.objects.all()
    serializer_class = CareRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsCareRequestPermission]

    def get_queryset(self):
        """
        Role-aware query + optional filters:
        - Patients: their own requests (as patient) or those they created
        - Caregivers: requests assigned to them OR new requests (browseable pool)
        - Doctors/Admins: all
        Supports optional ?status= and ?ordering= query params layered on top.
        """
        user = self.request.user
        qs = super().get_queryset()
        # Role-based visibility first
        if user.role == 'patient':
            qs = qs.filter(models.Q(patient=user) | models.Q(created_by=user))
        elif user.role == 'caregiver':
            qs = qs.filter(models.Q(caregiver=user) | models.Q(status='new'))
        # doctors/admins: leave qs as all

        # Optional filters
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        ordering = self.request.query_params.get('ordering')
        if ordering:
            qs = qs.order_by(ordering)
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

    # (Note) The role-aware get_queryset above supersedes the earlier version
    # that only applied filters. Keep a single definition to avoid overrides.

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

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        """Assigned caregiver starts the engagement.
        Rules:
        - Current status must be 'accepted'.
        - Acting user must be the assigned caregiver (or admin).
        - Transition status to 'in-progress'.
        """
        care_request = self.get_object()
        user = request.user
        if care_request.status != 'accepted':
            return Response({'detail': 'Only ACCEPTED requests can be started.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['caregiver', 'admin']:
            return Response({'detail': 'Only caregivers or admins can start a request.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'caregiver' and care_request.caregiver_id not in (None, user.id):
            return Response({'detail': 'You are not the assigned caregiver for this request.'}, status=status.HTTP_403_FORBIDDEN)
        # If caregiver was not set (edge case), set to acting caregiver
        if user.role == 'caregiver' and care_request.caregiver_id is None:
            care_request.caregiver = user
        care_request.status = 'in-progress'
        care_request.save(update_fields=['caregiver', 'status'])
        return Response(CareRequestSerializer(care_request, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """Assigned caregiver marks the engagement completed.
        Rules:
        - Status must be 'in-progress' or 'accepted' (allow direct complete from accepted if needed).
        - Acting user must be assigned caregiver (or admin).
        - Transition status to 'completed'.
        """
        care_request = self.get_object()
        user = request.user
        if care_request.status not in ['in-progress', 'accepted']:
            return Response({'detail': 'Only IN-PROGRESS or ACCEPTED requests can be completed.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['caregiver', 'admin']:
            return Response({'detail': 'Only caregivers or admins can complete a request.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'caregiver' and care_request.caregiver_id != user.id:
            return Response({'detail': 'You are not the assigned caregiver for this request.'}, status=status.HTTP_403_FORBIDDEN)
        care_request.status = 'completed'
        care_request.save(update_fields=['status'])
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
    """
    ViewSet for managing doctor assignment requests.
    Allows patients to request doctors and doctors to accept/decline requests.
    """
    queryset = DoctorRequest.objects.all()
    serializer_class = DoctorRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctorRequestPermission]
    
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        # Patients see only their own requests
        if user.role == 'patient':
            qs = qs.filter(patient=user)
        # Doctors see requests assigned to them or new unassigned requests
        elif user.role == 'doctor':
            qs = qs.filter(models.Q(doctor=user) | models.Q(status='new'))
        # Admins see all by default

        # Optional filters
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        ordering = self.request.query_params.get('ordering')
        if ordering:
            qs = qs.order_by(ordering)

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
