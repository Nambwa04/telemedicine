from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet
from django.urls import path
from . import views

router = DefaultRouter()
router.register(r'', AppointmentViewSet, basename='appointment')

# Extra actions:
# POST /<id>/cancel_appointment/  (cancel appointment)
# GET  /<id>/join_video/         (get video link)

# urlpatterns = 
urlpatterns = [
    path('today/', views.today_appointments, name='today-appointments'),
] + router.urls