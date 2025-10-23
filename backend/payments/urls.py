from django.urls import path
from .views import B2CPayoutView, B2CResultCallbackView, B2CTimeoutCallbackView

app_name = 'payments'

urlpatterns = [
    path('b2c/payout', B2CPayoutView.as_view(), name='b2c_payout'),
    path('b2c/result', B2CResultCallbackView.as_view(), name='b2c_result'),
    path('b2c/timeout', B2CTimeoutCallbackView.as_view(), name='b2c_timeout'),
]
