from rest_framework import serializers
from .models import CareRequest

class CareRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareRequest
        fields = '__all__'
