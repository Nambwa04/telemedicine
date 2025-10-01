from rest_framework.routers import DefaultRouter
from .views import CareRequestViewSet

router = DefaultRouter()
router.register(r'', CareRequestViewSet, basename='care-request')

urlpatterns = router.urls
