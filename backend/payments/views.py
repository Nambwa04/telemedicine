from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

from .serializers import PayoutCreateSerializer, PayoutSerializer
from .models import Payout
from .daraja import b2c_payment_request


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') == 'admin'))


class B2CPayoutView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        serializer = PayoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payout = serializer.save()

        # Construct callback URLs
        base = settings.DARAJA_CALLBACK_BASE_URL.rstrip('/')
        result_url = f"{base}{reverse('payments:b2c_result')}"
        timeout_url = f"{base}{reverse('payments:b2c_timeout')}"

        try:
            _, data = b2c_payment_request(
                amount=payout.amount,
                phone_number=payout.recipient_phone,
                remarks=payout.remarks or f"Payout {payout.id}",
                command_id=payout.command_id,
                queue_timeout_url=timeout_url,
                result_url=result_url,
            )
        except Exception as e:
            payout.status = Payout.Status.FAILED
            payout.result_desc = str(e)
            payout.save(update_fields=['status', 'result_desc'])
            return Response({"detail": "Failed to initiate payout", "error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        payout.safaricom_conversation_id = data.get('ConversationID', '')
        payout.originator_conversation_id = data.get('OriginatorConversationID', '')
        payout.result_desc = data.get('ResponseDescription', '')
        payout.save(update_fields=['safaricom_conversation_id', 'originator_conversation_id', 'result_desc'])

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class B2CResultCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        # According to Daraja, Result callback contains Result parameters with ConversationID
        result = data.get('Result', {})
        conv_id = result.get('ConversationID') or data.get('ConversationID')

        payout = Payout.objects.filter(safaricom_conversation_id=conv_id).first()
        if not payout:
            # Fallback: try OriginatorConversationID
            originator = data.get('OriginatorConversationID') or result.get('OriginatorConversationID')
            payout = Payout.objects.filter(originator_conversation_id=originator).first()

        if payout:
            payout.raw_callback = data
            result_code = str(result.get('ResultCode', ''))
            result_desc = result.get('ResultDesc', '')
            payout.result_code = result_code
            payout.result_desc = result_desc
            if result_code == '0':
                payout.status = Payout.Status.SUCCESS
            else:
                payout.status = Payout.Status.FAILED
            payout.save()

        return Response({"status": "ok"})


@method_decorator(csrf_exempt, name='dispatch')
class B2CTimeoutCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        conv_id = data.get('ConversationID')
        if conv_id:
            payout = Payout.objects.filter(safaricom_conversation_id=conv_id).first()
            if payout:
                payout.status = Payout.Status.TIMEOUT
                payout.raw_callback = data
                payout.save(update_fields=['status', 'raw_callback'])
        return Response({"status": "timeout logged"})
