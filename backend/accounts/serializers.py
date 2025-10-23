from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import EmailVerificationToken, PasswordResetToken

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'first_name', 'last_name', 'primary_condition', 'phone', 'doctor', 'doctor_name', 'latitude', 'longitude', 'distance', 'availability']
    
    def get_doctor_name(self, obj):
        """Return the assigned doctor's full name if exists"""
        if obj.doctor:
            return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() or obj.doctor.email
        return None

    def get_distance(self, obj):
        # If view attached a precomputed distance in meters
        d = getattr(obj, '_distance_meters', None)
        if d is None:
            return None
        # Return numeric meters
        try:
            return round(float(d), 2)
        except Exception:
            return None

    def get_availability(self, obj):
        # Consider a caregiver "Available Now" if location updated within last 10 minutes
        from django.utils import timezone
        if getattr(obj, 'role', None) != 'caregiver':
            return None
        updated = getattr(obj, 'location_updated_at', None)
        if not updated:
            return 'Contact for availability'
        if timezone.now() - updated <= timezone.timedelta(minutes=10):
            return 'Available Now'
        if timezone.now() - updated <= timezone.timedelta(hours=24):
            return 'Recently Active'
        return 'Contact for availability'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'password', 'primary_condition', 'first_name', 'last_name']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        user = User(**validated_data)
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        return user


class EmailVerificationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not get_user_model().objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email does not exist')
        return value


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate_token(self, value):
        if not EmailVerificationToken.objects.filter(token=value, used=False).exists():
            raise serializers.ValidationError('Invalid or used token')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not get_user_model().objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email does not exist')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs.get('token')
        qs = PasswordResetToken.objects.filter(token=token, used=False)
        if not qs.exists():
            raise serializers.ValidationError({'token': 'Invalid or used token'})
        validate_password(attrs['new_password'])
        return attrs
