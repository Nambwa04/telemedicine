from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import TimesheetEntry
from .serializers import TimesheetEntrySerializer


class TimesheetEntryViewSet(viewsets.ModelViewSet):
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
