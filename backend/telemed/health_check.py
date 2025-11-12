"""
Health check and diagnostics endpoint for production debugging.
"""
from django.http import JsonResponse
from django.conf import settings
import sys


def health_check(request):
    """Basic health check to verify the app is running."""
    
    # Check database connectivity
    db_status = "unknown"
    db_error = None
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    
    # Check cache connectivity
    cache_status = "unknown"
    cache_error = None
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        cache_status = "connected" if result == 'ok' else "error"
    except Exception as e:
        cache_status = "error"
        cache_error = str(e)
    
    return JsonResponse({
        'status': 'ok' if db_status == 'connected' else 'degraded',
        'database': {
            'status': db_status,
            'error': db_error,
            'backend': settings.DATABASES['default']['ENGINE'],
        },
        'cache': {
            'status': cache_status,
            'error': cache_error,
        },
        'environment': {
            'debug': settings.DEBUG,
            'allowed_hosts': settings.ALLOWED_HOSTS,
            'python_version': sys.version,
        }
    })


def environment_check(request):
    """Check environment variables (for admin debugging only)."""
    import os
    
    # Only show this in development or with special header
    if not settings.DEBUG and request.META.get('HTTP_X_ADMIN_TOKEN') != os.getenv('ADMIN_DEBUG_TOKEN'):
        return JsonResponse({'error': 'Not authorized'}, status=403)
    
    env_vars = {
        'WEBSITE_HOSTNAME': bool(os.getenv('WEBSITE_HOSTNAME')),
        'AZURE_POSTGRESQL_CONNECTIONSTRING': bool(os.getenv('AZURE_POSTGRESQL_CONNECTIONSTRING')),
        'AZURE_REDIS_CONNECTIONSTRING': bool(os.getenv('AZURE_REDIS_CONNECTIONSTRING')),
        'MY_SECRET_KEY': bool(os.getenv('MY_SECRET_KEY')),
        'EMAIL_USER': bool(os.getenv('EMAIL_USER')),
        'EMAIL_PASSWORD': bool(os.getenv('EMAIL_PASSWORD')),
        'DARAJA_CONSUMER_KEY': bool(os.getenv('DARAJA_CONSUMER_KEY')),
        'DARAJA_CONSUMER_SECRET': bool(os.getenv('DARAJA_CONSUMER_SECRET')),
    }
    
    return JsonResponse({
        'environment_variables': env_vars,
        'settings': {
            'debug': settings.DEBUG,
            'allowed_hosts': settings.ALLOWED_HOSTS,
            'databases_configured': list(settings.DATABASES.keys()),
        }
    })
