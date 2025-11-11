from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CareRequestViewSet, DoctorRequestViewSet

router = DefaultRouter()
router.register(r'care', CareRequestViewSet, basename='care-request')
router.register(r'doctor', DoctorRequestViewSet, basename='doctor-request')

# Backward-compatible routes expected by existing tests:
care_accept = CareRequestViewSet.as_view({'post': 'accept'})
care_decline = CareRequestViewSet.as_view({'post': 'decline'})

urlpatterns = router.urls + [
	# e.g., /api/requests/123/accept/
	path('<int:pk>/accept/', care_accept, name='care-request-accept-compat'),
	path('<int:pk>/decline/', care_decline, name='care-request-decline-compat'),
]
