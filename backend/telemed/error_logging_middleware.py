"""
Middleware to catch and log exceptions in production.
"""
import logging
import traceback
from django.http import JsonResponse

logger = logging.getLogger('django.request')


class ErrorLoggingMiddleware:
    """
    Middleware to catch exceptions and return JSON responses in production.
    This helps debug API errors when DEBUG=False.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        return self.get_response(request)
    
    def process_exception(self, request, exception):
        """
        Log the exception and return a JSON response for API requests.
        """
        # Log the full exception
        logger.error(
            f"Exception occurred: {exception.__class__.__name__}: {str(exception)}\n"
            f"Path: {request.path}\n"
            f"Method: {request.method}\n"
            f"Traceback:\n{traceback.format_exc()}"
        )
        
        # For API requests, return JSON instead of HTML
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'detail': str(exception) if request.user.is_staff else 'An error occurred processing your request',
                'type': exception.__class__.__name__
            }, status=500)
        
        # Let Django handle non-API errors normally
        return None
