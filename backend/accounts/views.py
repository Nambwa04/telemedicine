from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import JsonResponse
from datetime import timedelta
from .serializers import (
    RegisterSerializer, UserSerializer,
    EmailVerificationRequestSerializer, EmailVerificationConfirmSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .models import EmailVerificationToken, PasswordResetToken
from appointments.models import Appointment
from accounts.models import User

User = get_user_model()

# Dashboard stats endpoint for doctor dashboard
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
# @permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()
    # Appointments for today
    today_appointments = Appointment.objects.filter(date=today).count()
    # Total patients
    total_patients = User.objects.filter(role='patient').count()
    # Pending consults (in-progress)
    pending_consults = Appointment.objects.filter(status='in-progress').count()
    # Completed appointments today
    completed_today = Appointment.objects.filter(date=today, status='completed').count()
    return JsonResponse({
        "todayAppointments": today_appointments,
        "totalPatients": total_patients,
        "pendingConsults": pending_consults,
        "completedToday": completed_today
    })

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'

class IsDoctorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['doctor', 'admin']

# Admin registration endpoint
class AdminRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    def perform_create(self, serializer):
        serializer.save(role='admin')

# Admin: List all users
class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.all().order_by('id')

# Admin: Create doctor
class AdminDoctorCreateView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAdmin]
    def perform_create(self, serializer):
        serializer.save(role='doctor')

# Admin: Delete doctor
class AdminDoctorDeleteView(generics.DestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='doctor')

# Admin: Update doctor
class AdminDoctorUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='doctor')

# Admin: Create patient
class AdminPatientCreateView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAdmin]
    def perform_create(self, serializer):
        serializer.save(role='patient')

# Admin: Update patient
class AdminPatientUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='patient')

# Admin: Delete patient
class AdminPatientDeleteView(generics.DestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='patient')

# Admin: Create caregiver
class AdminCaregiverCreateView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAdmin]
    def perform_create(self, serializer):
        serializer.save(role='caregiver')

# Admin: Update caregiver
class AdminCaregiverUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='caregiver')

# Admin: Delete caregiver
class AdminCaregiverDeleteView(generics.DestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        return User.objects.filter(role='caregiver')

# Doctor: Update patient
class DoctorUpdatePatientView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsDoctorOrAdmin]
    def get_queryset(self):
        return User.objects.filter(role='patient')

# Admin: System analytics
class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from appointments.models import Appointment
        from medications.models import Medication
        from health.models import VitalReading, SymptomLog, LabResult
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        # User statistics
        total_users = User.objects.count()
        patient_count = User.objects.filter(role='patient').count()
        doctor_count = User.objects.filter(role='doctor').count()
        caregiver_count = User.objects.filter(role='caregiver').count()
        admin_count = User.objects.filter(role='admin').count()
        
        # Recent registrations (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_registrations = User.objects.filter(date_joined__gte=thirty_days_ago).count()
        
        # Appointment statistics
        total_appointments = Appointment.objects.count()
        scheduled_appointments = Appointment.objects.filter(status='scheduled').count()
        completed_appointments = Appointment.objects.filter(status='completed').count()
        cancelled_appointments = Appointment.objects.filter(status='cancelled').count()
        
        # Today's appointments
        today = timezone.now().date()
        today_appointments = Appointment.objects.filter(date=today).count()
        
        # This week's appointments
        week_start = today - timedelta(days=today.weekday())
        this_week_appointments = Appointment.objects.filter(
            date__gte=week_start,
            date__lte=today
        ).count()
        
        # Appointments by status
        appointments_by_status = list(
            Appointment.objects.values('status').annotate(count=Count('id'))
        )
        
        # Health metrics
        total_vitals = VitalReading.objects.count()
        total_symptoms = SymptomLog.objects.count()
        total_labs = LabResult.objects.count()
        
        # Medication statistics
        total_medications = Medication.objects.count()
        active_medications = Medication.objects.filter(
            next_due__gte=today
        ).count() if Medication.objects.filter(next_due__isnull=False).exists() else 0
        
        # Average medication compliance
        avg_compliance = Medication.objects.aggregate(
            avg_compliance=models.Avg('compliance')
        )['avg_compliance'] or 0
        
        # Recent activity (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_appointments = Appointment.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        recent_vitals = VitalReading.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        
        # Top conditions (from patients)
        top_conditions = list(
            User.objects.filter(role='patient', primary_condition__isnull=False)
            .exclude(primary_condition='')
            .values('primary_condition')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        
        # Doctor workload
        doctor_workload = list(
            Appointment.objects.filter(status='scheduled')
            .values('doctor__first_name', 'doctor__last_name', 'doctor_id')
            .annotate(appointment_count=Count('id'))
            .order_by('-appointment_count')[:10]
        )
        
        return Response({
            'users': {
                'total': total_users,
                'patients': patient_count,
                'doctors': doctor_count,
                'caregivers': caregiver_count,
                'admins': admin_count,
                'recent_registrations': recent_registrations,
            },
            'appointments': {
                'total': total_appointments,
                'scheduled': scheduled_appointments,
                'completed': completed_appointments,
                'cancelled': cancelled_appointments,
                'today': today_appointments,
                'this_week': this_week_appointments,
                'by_status': appointments_by_status,
                'recent': recent_appointments,
            },
            'health': {
                'total_vitals': total_vitals,
                'total_symptoms': total_symptoms,
                'total_labs': total_labs,
                'recent_vitals': recent_vitals,
            },
            'medications': {
                'total': total_medications,
                'active': active_medications,
                'avg_compliance': round(avg_compliance, 1),
            },
            'insights': {
                'top_conditions': top_conditions,
                'doctor_workload': doctor_workload,
            }
        })

# Admin: View all appointments
class AdminAppointmentListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from appointments.models import Appointment
        from appointments.serializers import AppointmentSerializer
        
        # Get query parameters
        status_filter = request.query_params.get('status', None)
        date_filter = request.query_params.get('date', None)
        doctor_filter = request.query_params.get('doctor', None)
        patient_filter = request.query_params.get('patient', None)
        
        # Base queryset
        queryset = Appointment.objects.select_related('patient', 'doctor').all()
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(date=date_filter)
        if doctor_filter:
            queryset = queryset.filter(doctor_id=doctor_filter)
        if patient_filter:
            queryset = queryset.filter(patient_id=patient_filter)
        
        # Order by date and time
        queryset = queryset.order_by('-date', '-time')
        
        # Paginate
        paginator = PageNumberPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        
        serializer = AppointmentSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

class IsSelfOrDoctor(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Allow safe (GET) methods for authenticated users
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        # Allow PATCH/PUT/DELETE if user is the patient or any doctor
        return request.user.is_authenticated and (
            request.user == obj or request.user.role == 'doctor'
        )

class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrDoctor]

    def get_queryset(self):
        return User.objects.filter(role='patient')

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        allowed_fields = {'first_name', 'last_name', 'primary_condition', 'phone'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        for k, v in data.items():
            setattr(user, k, v)
        user.save()
        return Response(UserSerializer(user).data)


class PatientListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(role='patient')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search))
        return qs.order_by('id')


class DoctorListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(role='doctor')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search))
        return qs.order_by('id')


class CaregiverListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(role='caregiver')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search))
        return qs.order_by('id')


class ScopedRateThrottle(throttling.SimpleRateThrottle):
    scope = None
    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class EmailVerificationRequestThrottle(ScopedRateThrottle):
    scope = 'email_verify'


class PasswordResetRequestThrottle(ScopedRateThrottle):
    scope = 'password_reset'


class EmailVerificationRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailVerificationRequestThrottle]

    def post(self, request):
        serializer = EmailVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data['email'])
        token = EmailVerificationToken.objects.create(user=user)
        # In a real system, send email. Here we return token for dev/testing.
        return Response({'detail': 'Verification email dispatched', 'token': str(token.token)})


class EmailVerificationConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_obj = EmailVerificationToken.objects.get(token=serializer.validated_data['token'], used=False)
        user = token_obj.user
        user.is_active = True  # ensure active
        user.save(update_fields=['is_active'])
        token_obj.mark_used()
        return Response({'detail': 'Email verified'})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data['email'])
        token = PasswordResetToken.objects.create(user=user)
        return Response({'detail': 'Password reset email dispatched', 'token': str(token.token)})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_obj = PasswordResetToken.objects.get(token=serializer.validated_data['token'], used=False)
        user = token_obj.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        token_obj.mark_used()
        return Response({'detail': 'Password updated'}, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    """
    Google OAuth authentication endpoint.
    Accepts a Google credential token and creates/authenticates a user.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        import jwt
        
        credential = request.data.get('credential')
        role = request.data.get('role', 'patient')
        
        if not credential:
            return Response(
                {'detail': 'Google credential is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode the JWT token from Google (without verification for now - in production, verify signature)
            # For production, you should verify with Google's public keys
            decoded_token = jwt.decode(credential, options={"verify_signature": False})
            
            email = decoded_token.get('email')
            name = decoded_token.get('name', '')
            first_name = decoded_token.get('given_name', '')
            last_name = decoded_token.get('family_name', '')
            
            if not email:
                return Response(
                    {'detail': 'Email not found in Google token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                # User exists, just login
            except User.DoesNotExist:
                # Create new user
                username = email.split('@')[0]
                # Ensure unique username
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    is_active=True
                )
                # Set unusable password for Google auth users
                user.set_unusable_password()
                user.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role
                }
            }, status=status.HTTP_200_OK)
            
        except jwt.InvalidTokenError as e:
            return Response(
                {'detail': f'Invalid Google token: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'detail': f'Authentication failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
