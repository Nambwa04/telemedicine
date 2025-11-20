from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaregiverAvailabilityViewSet, SpecificDateAvailabilityViewSet

router = DefaultRouter()
router.register(r'weekly', CaregiverAvailabilityViewSet, basename='weekly-availability')
router.register(r'specific', SpecificDateAvailabilityViewSet, basename='specific-availability')

urlpatterns = [
    path('', include(router.urls)),
]
