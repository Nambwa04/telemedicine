from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, date as dt_date, timedelta
from .models import CaregiverAvailability, SpecificDateAvailability
from .serializers import (
    CaregiverAvailabilitySerializer,
    SpecificDateAvailabilitySerializer,
    BulkAvailabilitySerializer
)


class CaregiverAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing caregiver availability slots.
    """
    serializer_class = CaregiverAvailabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'caregiver':
            return CaregiverAvailability.objects.filter(caregiver=user)
        elif user.role == 'admin':
            return CaregiverAvailability.objects.all()
        # Patients/doctors can view caregiver availability
        caregiver_id = self.request.query_params.get('caregiver_id')
        if caregiver_id:
            return CaregiverAvailability.objects.filter(caregiver_id=caregiver_id)
        return CaregiverAvailability.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(caregiver=self.request.user)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create availability slots for multiple days at once"""
        if request.user.role != 'caregiver':
            return Response(
                {'error': 'Only caregivers can set availability'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BulkAvailabilitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        created_slots = []
        
        for day in data['days']:
            # Check if slot already exists
            existing = CaregiverAvailability.objects.filter(
                caregiver=request.user,
                day_of_week=day,
                start_time=data['start_time']
            ).first()
            
            if existing:
                # Update existing slot
                existing.end_time = data['end_time']
                existing.is_available = True
                existing.notes = data.get('notes', '')
                existing.save()
                created_slots.append(existing)
            else:
                # Create new slot
                slot = CaregiverAvailability.objects.create(
                    caregiver=request.user,
                    day_of_week=day,
                    start_time=data['start_time'],
                    end_time=data['end_time'],
                    notes=data.get('notes', '')
                )
                created_slots.append(slot)
        
        result_serializer = CaregiverAvailabilitySerializer(created_slots, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def my_schedule(self, request):
        """Get caregiver's full weekly schedule"""
        if request.user.role != 'caregiver':
            return Response(
                {'error': 'Only caregivers can view their schedule'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        slots = CaregiverAvailability.objects.filter(caregiver=request.user)
        serializer = self.get_serializer(slots, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Toggle availability for a specific slot"""
        slot = self.get_object()
        if slot.caregiver != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'You can only modify your own availability'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        slot.is_available = not slot.is_available
        slot.save()
        serializer = self.get_serializer(slot)
        return Response(serializer.data)


class SpecificDateAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing specific date availability overrides.
    """
    serializer_class = SpecificDateAvailabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'caregiver':
            return SpecificDateAvailability.objects.filter(caregiver=user)
        elif user.role == 'admin':
            return SpecificDateAvailability.objects.all()
        # Patients/doctors can view caregiver availability
        caregiver_id = self.request.query_params.get('caregiver_id')
        if caregiver_id:
            return SpecificDateAvailability.objects.filter(caregiver_id=caregiver_id)
        return SpecificDateAvailability.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(caregiver=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_unavailable(self, request):
        """Mark a specific date/time as unavailable"""
        if request.user.role != 'caregiver':
            return Response(
                {'error': 'Only caregivers can set availability'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        date_str = request.data.get('date')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        reason = request.data.get('reason', '')
        
        if not date_str:
            return Response(
                {'error': 'Date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        unavailability = SpecificDateAvailability.objects.create(
            caregiver=request.user,
            date=date_str,
            start_time=start_time,
            end_time=end_time,
            is_available=False,
            reason=reason
        )
        
        serializer = self.get_serializer(unavailability)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming specific date availability/unavailability"""
        if request.user.role != 'caregiver':
            return Response(
                {'error': 'Only caregivers can view their schedule'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = dt_date.today()
        # Show next 30 days
        end_date = today + timedelta(days=30)
        
        slots = SpecificDateAvailability.objects.filter(
            caregiver=request.user,
            date__gte=today,
            date__lte=end_date
        )
        serializer = self.get_serializer(slots, many=True)
        return Response(serializer.data)
