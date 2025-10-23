from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg
import math
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
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()
    user = request.user
    
    # For doctors, filter by their patients; admins see all
    if user.role == 'doctor':
        # Appointments for today for this doctor's patients
        today_appointments = Appointment.objects.filter(
            date=today,
            patient__doctor=user
        ).count()
        # Total patients assigned to this doctor
        total_patients = User.objects.filter(role='patient', doctor=user).count()
        # Pending consults for this doctor's patients
        pending_consults = Appointment.objects.filter(
            status='in-progress',
            patient__doctor=user
        ).count()
        # Completed appointments today for this doctor's patients
        completed_today = Appointment.objects.filter(
            date=today,
            status='completed',
            patient__doctor=user
        ).count()
    else:
        # Admin or other roles see all stats
        today_appointments = Appointment.objects.filter(date=today).count()
        total_patients = User.objects.filter(role='patient').count()
        pending_consults = Appointment.objects.filter(status='in-progress').count()
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
        from django.utils.dateparse import parse_date
        
    # Optional filters (date only)
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        # Parse dates (inclusive range)
        date_from = parse_date(date_from_str) if date_from_str else None
        if date_from_str and not date_from:
            return Response({'detail': 'Invalid date_from. Expected YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        date_to = parse_date(date_to_str) if date_to_str else None
        if date_to_str and not date_to:
            return Response({'detail': 'Invalid date_to. Expected YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if date_from and date_to and date_from > date_to:
            return Response({'detail': 'date_from must be before or equal to date_to.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build filtered appointments by date range only

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
        base_apts = Appointment.objects.all()
        filtered_apts = base_apts
        if date_from:
            filtered_apts = filtered_apts.filter(date__gte=date_from)
        if date_to:
            filtered_apts = filtered_apts.filter(date__lte=date_to)

        total_appointments = filtered_apts.count()
        scheduled_appointments = filtered_apts.filter(status='scheduled').count()
        completed_appointments = filtered_apts.filter(status='completed').count()
        cancelled_appointments = filtered_apts.filter(status='cancelled').count()
        
        # Today's appointments (global, not restricted by date filters)
        today = timezone.now().date()
        today_appointments = base_apts.filter(date=today).count()
        
        # This week's appointments
        week_start = today - timedelta(days=today.weekday())
        this_week_qs = base_apts.filter(date__gte=week_start, date__lte=today)
        this_week_appointments = this_week_qs.count()
        
        # Appointments by status
        appointments_by_status = list(
            filtered_apts.values('status').annotate(count=Count('id'))
        )

        # Appointments trend (daily counts within selected range or last 7 days by default)
        if date_from and date_to:
            trend_start, trend_end = date_from, date_to
        else:
            trend_end = today
            trend_start = today - timedelta(days=6)
        trend_qs = base_apts.filter(date__gte=trend_start, date__lte=trend_end)
        # Build a dict of date -> count
        trend_counts = { (trend_start + timedelta(days=i)): 0 for i in range((trend_end - trend_start).days + 1) }
        for row in trend_qs.values('date').annotate(count=Count('id')):
            d = row['date']
            if d in trend_counts:
                trend_counts[d] = row['count']
        appointments_trend = [
            { 'date': d.isoformat(), 'count': trend_counts[d] } for d in sorted(trend_counts.keys())
        ]
        # Build users trend over the same window
        # Note: using date_joined__date for date-only comparisons
        def daterange(start_date, end_date):
            for n in range(int((end_date - start_date).days) + 1):
                yield start_date + timedelta(n)
        users_trend_map = { d: 0 for d in daterange(trend_start, trend_end) }
        # Aggregate registrations by date
        registrations = (
            User.objects
            .filter(date_joined__date__gte=trend_start, date_joined__date__lte=trend_end)
            .extra(select={"d":"date(date_joined)"})
            .values('d')
            .annotate(count=Count('id'))
        )
        from django.utils.dateparse import parse_date as _parse_date
        for row in registrations:
            d = row['d']
            d_parsed = _parse_date(d) if isinstance(d, str) else d
            if d_parsed in users_trend_map:
                users_trend_map[d_parsed] = row['count']
        users_trend = [ { 'date': d.isoformat(), 'count': users_trend_map[d] } for d in sorted(users_trend_map.keys()) ]

        # Month-to-date vs previous month-to-date deltas
        def month_ranges(ref_date):
            cur_start = ref_date.replace(day=1)
            cur_end = ref_date
            prev_last = cur_start - timedelta(days=1)
            prev_start = prev_last.replace(day=1)
            # prior month same day (or last day if shorter)
            try:
                prev_end = prev_start.replace(day=ref_date.day)
                if prev_end > prev_last:
                    prev_end = prev_last
            except Exception:
                prev_end = prev_last
            return cur_start, cur_end, prev_start, prev_end

        cur_start, cur_end, prev_start, prev_end = month_ranges(today)

        users_current_mtd = User.objects.filter(date_joined__date__gte=cur_start, date_joined__date__lte=cur_end).count()
        users_prev_mtd = User.objects.filter(date_joined__date__gte=prev_start, date_joined__date__lte=prev_end).count()
        users_mtd_delta = users_current_mtd - users_prev_mtd

        apts_current_qs = base_apts.filter(date__gte=cur_start, date__lte=cur_end)
        apts_prev_qs = base_apts.filter(date__gte=prev_start, date__lte=prev_end)
        apts_current_mtd = apts_current_qs.count()
        apts_prev_mtd = apts_prev_qs.count()
        apts_mtd_delta = apts_current_mtd - apts_prev_mtd

        meds_current_mtd = Medication.objects.filter(created_at__date__gte=cur_start, created_at__date__lte=cur_end).count()
        meds_prev_mtd = Medication.objects.filter(created_at__date__gte=prev_start, created_at__date__lte=prev_end).count()
        meds_mtd_delta = meds_current_mtd - meds_prev_mtd
        
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
        recent_appointments = base_apts.filter(
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
                'trend': users_trend,
                'month': {
                    'current': users_current_mtd,
                    'previous': users_prev_mtd,
                    'delta': users_mtd_delta,
                }
            },
            'appointments': {
                'total': total_appointments,
                'scheduled': scheduled_appointments,
                'completed': completed_appointments,
                'cancelled': cancelled_appointments,
                'today': today_appointments,
                'this_week': this_week_appointments,
                'by_status': appointments_by_status,
                'trend': appointments_trend,
                'recent': recent_appointments,
                'month': {
                    'current': apts_current_mtd,
                    'previous': apts_prev_mtd,
                    'delta': apts_mtd_delta,
                }
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
                'month': {
                    'current': meds_current_mtd,
                    'previous': meds_prev_mtd,
                    'delta': meds_mtd_delta,
                }
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
        user = self.request.user
        
        # Start with all patients
        qs = User.objects.filter(role='patient')
        
        # If user is a doctor, only show their assigned patients
        if user.role == 'doctor':
            qs = qs.filter(doctor=user)
        # Admins see all patients (no additional filter needed)
        
        # Apply search filter if provided
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

    def haversine_m(self, lat1, lon1, lat2, lon2):
        """Return distance in meters between two lat/lon points."""
        # convert decimal degrees to radians
        rlat1, rlon1, rlat2, rlon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlon = rlon2 - rlon1
        dlat = rlat2 - rlat1
        a = math.sin(dlat/2)**2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        R = 6371000.0  # meters
        return R * c

    def list(self, request, *args, **kwargs):
        qs = User.objects.filter(role='caregiver')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search))

        # Proximity filtering
        patient_lat = request.query_params.get('patient_lat')
        patient_lng = request.query_params.get('patient_lng')
        max_distance = request.query_params.get('max_distance')  # meters

        caregivers = list(qs)
        if patient_lat and patient_lng:
            try:
                plat = float(patient_lat)
                plng = float(patient_lng)
            except ValueError:
                plat = plng = None
            if plat is not None and plng is not None:
                # compute distances for those with known coords
                filtered = []
                for u in caregivers:
                    if u.latitude is not None and u.longitude is not None:
                        try:
                            d = self.haversine_m(plat, plng, float(u.latitude), float(u.longitude))
                            u._distance_meters = d
                            filtered.append(u)
                        except Exception:
                            pass
                # apply max distance if given
                try:
                    if max_distance is not None:
                        md = float(max_distance)
                        filtered = [u for u in filtered if getattr(u, '_distance_meters', 0) <= md]
                except ValueError:
                    pass
                # sort by distance
                filtered.sort(key=lambda x: getattr(x, '_distance_meters', float('inf')))
                caregivers = filtered

        serializer = self.get_serializer(caregivers, many=True)
        return Response(serializer.data)


class MeLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        """Update current user's geolocation (latitude/longitude)."""
        from django.utils import timezone
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        if lat is None or lng is None:
            return Response({'detail': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            request.user.latitude = float(lat)
            request.user.longitude = float(lng)
            request.user.location_updated_at = timezone.now()
            request.user.save(update_fields=['latitude', 'longitude', 'location_updated_at'])
            return Response({'detail': 'Location updated'})
        except Exception as e:
            return Response({'detail': f'Invalid coordinates: {e}'}, status=status.HTTP_400_BAD_REQUEST)


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
        from django.core.mail import send_mail
        from django.conf import settings
        
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data['email'])
        token = PasswordResetToken.objects.create(user=user)
        
        # Build reset URL (use frontend URL)
        frontend_url = request.META.get('HTTP_ORIGIN', 'http://localhost:3000')
        reset_url = f"{frontend_url}/password-reset?token={token.token}"
        
        # Send email
        subject = 'Password Reset Request - TeleMed+'
        message = f"""
Hello {user.first_name or user.email},

You recently requested to reset your password for your TeleMed+ account.

Click the link below to reset your password:
{reset_url}

If you didn't request this, you can safely ignore this email.

This link will expire in 24 hours for security reasons.

Best regards,
The TeleMed+ Team
"""
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send password reset email: {e}")
            # Continue anyway - for development, email will be in console
        
        return Response({
            'detail': 'Password reset email sent. Check your inbox.',
            'token': str(token.token)  # Include token for development/testing
        })


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            token_obj = PasswordResetToken.objects.get(
                token=serializer.validated_data['token'], 
                used=False
            )
            
            # Check if token is expired (24 hours)
            expiry_time = token_obj.created_at + timedelta(hours=24)
            if timezone.now() > expiry_time:
                return Response(
                    {'detail': 'This password reset link has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update password
            user = token_obj.user
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])
            token_obj.mark_used()
            
            return Response(
                {'detail': 'Password successfully reset. You can now login with your new password.'},
                status=status.HTTP_200_OK
            )
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid or already used reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )


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
