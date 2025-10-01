from rest_framework import permissions

class IsDoctorOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if request.user.role == 'doctor' and obj.doctor == request.user:
            return True
        if request.user.role == 'patient' and obj.patient == request.user:
            return True
        return False
