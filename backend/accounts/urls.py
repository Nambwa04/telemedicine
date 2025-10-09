from django.urls import path
from .views import (
    RegisterView, MeView, PatientListView, DoctorListView,
    EmailVerificationRequestView, EmailVerificationConfirmView,
    PasswordResetRequestView, PasswordResetConfirmView,
    AdminRegisterView, AdminUserListView, AdminDoctorCreateView, AdminDoctorDeleteView, AdminDoctorUpdateView,
    AdminPatientCreateView, AdminPatientUpdateView, AdminPatientDeleteView,
    AdminCaregiverCreateView, AdminCaregiverUpdateView, AdminCaregiverDeleteView,
    AdminAnalyticsView, AdminAppointmentListView, dashboard_stats, DoctorUpdatePatientView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('admin/register/', AdminRegisterView.as_view(), name='admin-register'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    # Doctor endpoints
    path('admin/doctors/create/', AdminDoctorCreateView.as_view(), name='admin-doctor-create'),
    path('admin/doctors/<int:pk>/update/', AdminDoctorUpdateView.as_view(), name='admin-doctor-update'),
    path('admin/doctors/<int:pk>/delete/', AdminDoctorDeleteView.as_view(), name='admin-doctor-delete'),
    # Patient endpoints
    path('admin/patients/create/', AdminPatientCreateView.as_view(), name='admin-patient-create'),
    path('admin/patients/<int:pk>/update/', AdminPatientUpdateView.as_view(), name='admin-patient-update'),
    path('admin/patients/<int:pk>/delete/', AdminPatientDeleteView.as_view(), name='admin-patient-delete'),
    # Doctor patient management
    path('doctor/patients/<int:pk>/update/', DoctorUpdatePatientView.as_view(), name='doctor-patient-update'),
    # Caregiver endpoints
    path('admin/caregivers/create/', AdminCaregiverCreateView.as_view(), name='admin-caregiver-create'),
    path('admin/caregivers/<int:pk>/update/', AdminCaregiverUpdateView.as_view(), name='admin-caregiver-update'),
    path('admin/caregivers/<int:pk>/delete/', AdminCaregiverDeleteView.as_view(), name='admin-caregiver-delete'),
    # Analytics and monitoring
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('admin/appointments/', AdminAppointmentListView.as_view(), name='admin-appointments'),
    path('dashboard-stats/', dashboard_stats, name='dashboard-stats'),
    # Other endpoints
    path('me/', MeView.as_view(), name='me'),
    path('patients/', PatientListView.as_view(), name='patients'),
    path('doctors/', DoctorListView.as_view(), name='doctors'),
    path('email/verify/request/', EmailVerificationRequestView.as_view(), name='email-verify-request'),
    path('email/verify/confirm/', EmailVerificationConfirmView.as_view(), name='email-verify-confirm'),
    path('password/reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
