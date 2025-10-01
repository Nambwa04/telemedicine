from rest_framework import viewsets, permissions
from .models import CareRequest
from .serializers import CareRequestSerializer


class IsCaregiverOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['caregiver', 'doctor']


class CareRequestViewSet(viewsets.ModelViewSet):
    queryset = CareRequest.objects.all()
    serializer_class = CareRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsCaregiverOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        ordering = self.request.query_params.get('ordering')
        if ordering:
            qs = qs.order_by(ordering)
        return qs
