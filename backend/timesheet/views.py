from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime
from .models import TimesheetEntry
from .serializers import TimesheetEntrySerializer


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing timesheet entries.
    Supports clock-in/out, submission, and admin approval/rejection.
    """
    serializer_class = TimesheetEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Caregivers see only their own timesheet entries
        user = self.request.user
        if user.role == 'caregiver':
            return TimesheetEntry.objects.filter(caregiver=user)
        # Admins can see all entries
        elif user.role == 'admin':
            return TimesheetEntry.objects.all()
        return TimesheetEntry.objects.none()

    def perform_create(self, serializer):
        # Automatically set caregiver to current user
        serializer.save(caregiver=self.request.user)

    @action(detail=False, methods=['post'])
    def submit_week(self, request):
        """Submit all draft entries for a given week"""
        entry_ids = request.data.get('entry_ids', [])
        if not entry_ids:
            return Response(
                {'error': 'No entry IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        entries = TimesheetEntry.objects.filter(
            id__in=entry_ids,
            caregiver=request.user,
            status='draft'
        )
        
        updated_count = entries.update(status='submitted')
        
        return Response({
            'message': f'{updated_count} entries submitted for approval',
            'updated_count': updated_count
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a timesheet entry (admin only)"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can approve timesheets'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry = self.get_object()
        entry.status = 'approved'
        entry.save()
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def clock_in(self, request):
        """Create a new in-progress timesheet entry for current caregiver if none active today."""
        user = request.user
        if user.role != 'caregiver':
            return Response({'error': 'Only caregivers can clock in'}, status=status.HTTP_403_FORBIDDEN)

        today = datetime.now().date()
        existing = TimesheetEntry.objects.filter(caregiver=user, date=today, status='in-progress').first()
        if existing:
            return Response({'error': 'You already have an active entry in progress'}, status=status.HTTP_400_BAD_REQUEST)

        client = request.data.get('client', 'Client')
        rate = request.data.get('rate', 0)
        notes = request.data.get('notes', '')

        entry = TimesheetEntry(caregiver=user, client=client)
        entry.clock_in(rate=rate, client=client, notes=notes)
        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def clock_out(self, request, pk=None):
        """Finalize an in-progress entry by setting end time and moving to draft."""
        entry = self.get_object()
        if request.user != entry.caregiver:
            return Response({'error': 'Cannot clock out another caregiver\'s entry'}, status=status.HTTP_403_FORBIDDEN)
        if entry.status != 'in-progress':
            return Response({'error': 'Entry is not in progress'}, status=status.HTTP_400_BAD_REQUEST)
        entry.clock_out()
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a timesheet entry (admin only)"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can reject timesheets'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry = self.get_object()
        entry.status = 'rejected'
        entry.notes = request.data.get('notes', entry.notes)
        entry.save()
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)
