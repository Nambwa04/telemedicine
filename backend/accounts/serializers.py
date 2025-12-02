from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import EmailVerificationToken, PasswordResetToken, VerificationDocument

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    Handles serialization of user profile data including role-specific fields
    like doctor assignment, caregiver availability, and verification status.
    """
    doctor_name = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    latest_verification_document_url = serializers.SerializerMethodField()
    latest_verification_document_uploaded_at = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'first_name', 'last_name',
            'primary_condition', 'phone', 'doctor', 'doctor_name',
            # Personal details
            'date_of_birth', 'gender', 'address', 'emergency_contact',
            'latitude', 'longitude', 'distance', 'availability',
            # Caregiver profile fields
            'experience_years', 'specializations', 'hourly_rate', 'bio', 'is_verified',
            # Verification doc info
            'latest_verification_document_url', 'latest_verification_document_uploaded_at'
        ]
    
    def get_doctor_name(self, obj):
        """Return the assigned doctor's full name if exists"""
        if obj.doctor:
            return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() or obj.doctor.email
        return None

    def get_distance(self, obj):
        """
        Return distance in meters if calculated by the view.
        Used for caregiver proximity search.
        """
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
        """
        Determine caregiver availability based on recent location updates.
        - 'Available Now': Location updated < 10 mins ago
        - 'Recently Active': Location updated < 24 hours ago
        - 'Contact for availability': Otherwise
        """
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

    def get_latest_verification_document_url(self, obj):
        """Return the URL of the most recently uploaded verification document."""
        doc = obj.verification_documents.order_by('-uploaded_at').first()
        if not doc or not getattr(doc, 'file', None):
            return None
        try:
            request = self.context.get('request')
            url = doc.file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_latest_verification_document_uploaded_at(self, obj):
        """Return the timestamp of the most recently uploaded verification document."""
        doc = obj.verification_documents.order_by('-uploaded_at').first()
        return doc.uploaded_at if doc else None


class VerificationDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for VerificationDocument model.
    Includes read-only fields for review status and reviewer details.
    """
    url = serializers.SerializerMethodField()
    reviewed_by = serializers.SerializerMethodField()

    class Meta:
        model = VerificationDocument
        fields = [
            'id', 'user', 'doc_type', 'note', 'uploaded_at', 'url',
            'status', 'review_note', 'reviewed_at', 'reviewed_by'
        ]
        read_only_fields = ['id', 'user', 'uploaded_at', 'url', 'reviewed_at', 'reviewed_by']

    def get_url(self, obj):
        try:
            request = self.context.get('request')
            url = obj.file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_reviewed_by(self, obj):
        u = getattr(obj, 'reviewed_by', None)
        if not u:
            return None
        return {
            'id': u.id,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
        }

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles password hashing and automatic username generation.
    """
    password = serializers.CharField(write_only=True)

    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'password', 'primary_condition', 'first_name', 'last_name', 'phone']
        extra_kwargs = {
            'username': {'required': False}
        }

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        phone = validated_data.pop('phone', '')
        
        # Generate unique username if not provided
        if 'username' not in validated_data:
            email = validated_data.get('email')
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username

        user = User(**validated_data)
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.phone = phone
        user.save()
        return user


class EmailVerificationRequestSerializer(serializers.Serializer):
    """Serializer for requesting an email verification token."""
    email = serializers.EmailField()

    def validate_email(self, value):
        if not get_user_model().objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email does not exist')
        return value


class EmailVerificationConfirmSerializer(serializers.Serializer):
    """Serializer for confirming email verification with a token."""
    token = serializers.UUIDField()

    def validate_token(self, value):
        if not EmailVerificationToken.objects.filter(token=value, used=False).exists():
            raise serializers.ValidationError('Invalid or used token')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting a password reset token."""
    email = serializers.EmailField()

    def validate_email(self, value):
        if not get_user_model().objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email does not exist')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for resetting password with a valid token."""
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs.get('token')
        qs = PasswordResetToken.objects.filter(token=token, used=False)
        if not qs.exists():
            raise serializers.ValidationError({'token': 'Invalid or used token'})
        validate_password(attrs['new_password'])
        return attrs
