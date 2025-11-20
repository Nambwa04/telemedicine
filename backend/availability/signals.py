from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from appointments.models import Appointment
from .models import SpecificDateAvailability


@receiver(post_save, sender=Appointment)
def create_unavailability_on_appointment(sender, instance, created, **kwargs):
    """
    When an appointment is created or updated for a caregiver, 
    automatically mark that time as unavailable.
    """
    # Only process if the appointment involves a caregiver
    if not hasattr(instance, 'doctor') or instance.doctor.role != 'caregiver':
        return
    
    # Only for scheduled or in-progress appointments
    if instance.status not in ['scheduled', 'in-progress']:
        return
    
    caregiver = instance.doctor
    
    # Check if unavailability already exists for this appointment
    existing = SpecificDateAvailability.objects.filter(
        appointment=instance
    ).first()
    
    if existing:
        # Update existing unavailability
        existing.date = instance.date
        existing.start_time = instance.time
        # Assume 1-hour appointments if no end time specified
        from datetime import datetime, timedelta
        start_dt = datetime.combine(instance.date, instance.time)
        end_dt = start_dt + timedelta(hours=1)
        existing.end_time = end_dt.time()
        existing.is_available = False
        existing.reason = f"Appointment: {instance.type}"
        existing.save()
    elif created:
        # Create new unavailability block
        from datetime import datetime, timedelta
        start_dt = datetime.combine(instance.date, instance.time)
        end_dt = start_dt + timedelta(hours=1)
        
        SpecificDateAvailability.objects.create(
            caregiver=caregiver,
            date=instance.date,
            start_time=instance.time,
            end_time=end_dt.time(),
            is_available=False,
            reason=f"Appointment: {instance.type}",
            appointment=instance
        )


@receiver(post_delete, sender=Appointment)
def remove_unavailability_on_appointment_delete(sender, instance, **kwargs):
    """
    When an appointment is deleted, remove the associated unavailability block.
    """
    SpecificDateAvailability.objects.filter(appointment=instance).delete()


@receiver(post_save, sender=Appointment)
def remove_unavailability_on_appointment_cancel(sender, instance, created, **kwargs):
    """
    When an appointment is cancelled or completed, remove the unavailability block.
    """
    if not created and instance.status in ['cancelled', 'completed']:
        SpecificDateAvailability.objects.filter(appointment=instance).delete()
