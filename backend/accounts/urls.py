from django.urls import path
from .views import (
    RegisterView, MeView, PatientListView, DoctorListView,
    EmailVerificationRequestView, EmailVerificationConfirmView,
    PasswordResetRequestView, PasswordResetConfirmView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),
    path('patients/', PatientListView.as_view(), name='patients'),
    path('doctors/', DoctorListView.as_view(), name='doctors'),
    path('email/verify/request/', EmailVerificationRequestView.as_view(), name='email-verify-request'),
    path('email/verify/confirm/', EmailVerificationConfirmView.as_view(), name='email-verify-confirm'),
    path('password/reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
