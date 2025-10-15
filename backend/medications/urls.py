from rest_framework.routers import DefaultRouter
from .views import MedicationViewSet, ComplianceFollowUpViewSet

router = DefaultRouter()
router.register(r'followups', ComplianceFollowUpViewSet, basename='compliance-followup')
router.register(r'', MedicationViewSet, basename='medication')

urlpatterns = router.urls
