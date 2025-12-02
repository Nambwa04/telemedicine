"""
Test data factories for creating user instances.
Provides helpers for creating admins, doctors, patients, and caregivers.
"""
from django.contrib.auth import get_user_model


def create_user(email: str, role: str, password: str = "Pass12345!", **extra):
    """Helper to create a user with required fields."""
    User = get_user_model()
    username = extra.pop('username', email.split('@')[0])
    return User.objects.create_user(email=email, username=username, role=role, password=password, **extra)


def create_admin(email: str = "admin@example.com", **extra):
    return create_user(email=email, role='admin', **extra)


def create_doctor(email: str = "doctor@example.com", **extra):
    return create_user(email=email, role='doctor', **extra)


def create_patient(email: str = "patient@example.com", **extra):
    return create_user(email=email, role='patient', **extra)


def create_caregiver(email: str = "care@example.com", **extra):
    return create_user(email=email, role='caregiver', **extra)
