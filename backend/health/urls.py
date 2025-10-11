from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import VitalReadingViewSet, SymptomLogViewSet, LabResultViewSet, HealthOverviewViewSet, LabResultUploadView

router = DefaultRouter()
router.register(r'vitals', VitalReadingViewSet, basename='vitals')
router.register(r'symptoms', SymptomLogViewSet, basename='symptoms')
router.register(r'labs', LabResultViewSet, basename='labs')

overview = HealthOverviewViewSet.as_view({'get': 'overview'})

urlpatterns = router.urls + [
	path('overview/', overview, name='health-overview'),
    path('lab-results/upload/', LabResultUploadView.as_view(), name='lab-result-upload'),
]
