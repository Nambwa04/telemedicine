from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from .models import CareNote, CareNoteComment, CareNoteRead
from .serializers import CareNoteSerializer, CareNoteCommentSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CareNotePermission(permissions.BasePermission):
    """
    - Doctors can view/create notes for their patients
    - Caregivers can view/create notes for patients they've worked with or are assigned to
    - Patients can view notes about themselves (read-only)
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admins have full access
        if user.role == 'admin':
            return True
        
        # Patient can view their own notes (read-only)
        if user.role == 'patient':
            return obj.patient == user and request.method in permissions.SAFE_METHODS
        
        # Doctor can access notes for their patients
        if user.role == 'doctor':
            return obj.patient.doctor == user
        
        # Caregiver can access notes for patients they've worked with
        if user.role == 'caregiver':
            # Check if caregiver has any timesheet entries for this patient
            from timesheet.models import TimesheetEntry
            has_worked = TimesheetEntry.objects.filter(
                caregiver=user,
                client=f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email
            ).exists()
            
            # Also check if they have care requests for this patient
            from requestsapp.models import CareRequest
            has_request = CareRequest.objects.filter(
                caregiver=user,
                patient=obj.patient
            ).exists()
            
            return has_worked or has_request
        
        return False


class CareNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CareNoteSerializer
    permission_classes = [CareNotePermission]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin sees all
        if user.role == 'admin':
            queryset = CareNote.objects.all()
        # Patient sees their own notes
        elif user.role == 'patient':
            queryset = CareNote.objects.filter(patient=user)
        # Doctor sees notes for their patients
        elif user.role == 'doctor':
            queryset = CareNote.objects.filter(patient__doctor=user)
        # Caregiver sees notes for patients they've worked with
        elif user.role == 'caregiver':
            from timesheet.models import TimesheetEntry
            from requestsapp.models import CareRequest
            
            # Get patients from timesheet entries
            timesheet_patients = TimesheetEntry.objects.filter(
                caregiver=user
            ).values_list('client', flat=True).distinct()
            
            # Get patients from care requests
            request_patients = CareRequest.objects.filter(
                caregiver=user
            ).values_list('patient', flat=True).distinct()
            
            # Combine both sources
            queryset = CareNote.objects.filter(
                Q(patient_id__in=request_patients) |
                Q(patient__first_name__in=[name.split()[0] for name in timesheet_patients if name]) |
                Q(patient__last_name__in=[name.split()[-1] for name in timesheet_patients if name and len(name.split()) > 1])
            ).distinct()
        else:
            queryset = CareNote.objects.none()
        
        # Filter by query params
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        note_type = self.request.query_params.get('note_type')
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        is_archived = self.request.query_params.get('is_archived')
        if is_archived is not None:
            queryset = queryset.filter(is_archived=is_archived.lower() == 'true')
        else:
            # By default, exclude archived notes
            queryset = queryset.filter(is_archived=False)
        
        return queryset.prefetch_related(
            Prefetch('comments', queryset=CareNoteComment.objects.select_related('author'))
        ).select_related('patient', 'author')
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a note as read by the current user"""
        note = self.get_object()
        CareNoteRead.objects.get_or_create(note=note, user=request.user)
        return Response({'status': 'marked as read'})
    
    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        """Toggle pin status of a note"""
        note = self.get_object()
        note.is_pinned = not note.is_pinned
        note.save()
        return Response({'is_pinned': note.is_pinned})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a note"""
        note = self.get_object()
        note.is_archived = True
        note.save()
        return Response({'status': 'archived'})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive a note"""
        note = self.get_object()
        note.is_archived = False
        note.save()
        return Response({'status': 'unarchived'})
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to a note"""
        note = self.get_object()
        content = request.data.get('content')
        
        if not content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comment = CareNoteComment.objects.create(
            note=note,
            author=request.user,
            content=content
        )
        
        serializer = CareNoteCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notes for the current user"""
        queryset = self.get_queryset()
        read_note_ids = CareNoteRead.objects.filter(user=request.user).values_list('note_id', flat=True)
        unread_notes = queryset.exclude(id__in=read_note_ids)
        
        serializer = self.get_serializer(unread_notes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def for_patient(self, request):
        """Get all notes for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(patient_id=patient_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Add this to the CareNoteViewSet to see what's failing

def create(self, request, *args, **kwargs):
    print("Received data:", request.data)  # Debug line
    serializer = self.get_serializer(data=request.data)
    if not serializer.is_valid():
        print("Validation errors:", serializer.errors)  # Debug line
    serializer.is_valid(raise_exception=True)
    self.perform_create(serializer)
    headers = self.get_success_headers(serializer.data)
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
