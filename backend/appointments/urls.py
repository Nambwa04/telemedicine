from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet

router = DefaultRouter()
router.register(r'', AppointmentViewSet, basename='appointment')

# Extra actions:
# POST /<id>/cancel_appointment/  (cancel appointment)
# GET  /<id>/join_video/         (get video link)

urlpatterns = router.urls
