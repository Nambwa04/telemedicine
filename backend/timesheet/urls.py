from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimesheetEntryViewSet

router = DefaultRouter()
router.register(r'', TimesheetEntryViewSet, basename='timesheet')

urlpatterns = [
    path('', include(router.urls)),
]
