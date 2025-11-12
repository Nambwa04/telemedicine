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
        # Log the full exception with more details
        import sys
        logger.error(
            f"Exception occurred: {exception.__class__.__name__}: {str(exception)}\n"
            f"Path: {request.path}\n"
            f"Method: {request.method}\n"
            f"User: {getattr(request, 'user', 'Anonymous')}\n"
            f"Request Body: {getattr(request, 'body', b'')[:500]}\n"
            f"Traceback:\n{traceback.format_exc()}"
        )
        
        # Also print to stderr for immediate visibility in Azure logs
        print(f"ERROR: {exception.__class__.__name__}: {str(exception)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        
        # For API requests, return JSON instead of HTML
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'detail': str(exception),
                'type': exception.__class__.__name__
            }, status=500)
        
        # Let Django handle non-API errors normally
        return None
