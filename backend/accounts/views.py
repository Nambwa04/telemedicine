from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q
from django.contrib.auth import get_user_model
from .serializers import (
    RegisterSerializer, UserSerializer,
    EmailVerificationRequestSerializer, EmailVerificationConfirmSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .models import EmailVerificationToken, PasswordResetToken
from django.utils import timezone

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        allowed_fields = {'first_name', 'last_name'}
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
