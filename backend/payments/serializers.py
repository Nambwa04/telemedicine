from rest_framework import serializers
from django.db import transaction
from accounts.models import User
from .models import Payout


class PayoutCreateSerializer(serializers.Serializer):
    """
    Serializer for initiating a payout.
    Validates recipient and amount before creating a Payout record.
    """
    recipient_id = serializers.IntegerField()
    phone = serializers.CharField(max_length=15)
    amount = serializers.IntegerField(min_value=1)
    remarks = serializers.CharField(max_length=160, required=False, allow_blank=True)
    command_id = serializers.CharField(max_length=64, required=False, default='BusinessPayment')

    def validate_recipient_id(self, value):
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('Recipient user not found')
        if user.role != 'caregiver':
            raise serializers.ValidationError('Recipient must be a caregiver')
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.get(id=validated_data['recipient_id'])
        payout = Payout.objects.create(
            recipient=user,
            recipient_phone=validated_data['phone'],
            amount=validated_data['amount'],
            remarks=validated_data.get('remarks', ''),
            command_id=validated_data.get('command_id', 'BusinessPayment'),
        )
        return payout


class PayoutSerializer(serializers.ModelSerializer):
    """
    Serializer for Payout model.
    Exposes payout details including status and transaction IDs.
    """
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)

    class Meta:
        model = Payout
        fields = [
            'id', 'recipient', 'recipient_email', 'recipient_phone', 'amount', 'command_id', 'remarks',
            'status', 'safaricom_conversation_id', 'originator_conversation_id',
            'result_code', 'result_desc', 'raw_callback', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'status', 'safaricom_conversation_id', 'originator_conversation_id',
            'result_code', 'result_desc', 'raw_callback', 'created_at', 'updated_at'
        ]
