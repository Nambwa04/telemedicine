from rest_framework.routers import DefaultRouter
from .views import CareRequestViewSet, DoctorRequestViewSet

router = DefaultRouter()
router.register(r'care', CareRequestViewSet, basename='care-request')
router.register(r'doctor', DoctorRequestViewSet, basename='doctor-request')

urlpatterns = router.urls
