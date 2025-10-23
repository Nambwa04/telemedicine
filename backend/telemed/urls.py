from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from pathlib import Path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


FRONTEND_BUILD_INDEX = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'build' / 'index.html'

def root_view(request, path=""):
    """
    Serve the built React single-page app (SPA) index.html.
    If the build does not yet exist, return a helpful placeholder message.
    """
    if FRONTEND_BUILD_INDEX.exists():
        with open(FRONTEND_BUILD_INDEX, 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse(
        """<!DOCTYPE html><html><head><meta charset='utf-8'><title>TeleMed+</title></head>
        <body style='font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:2rem;'>
        <h1>TeleMed+</h1>
        <p>The frontend build is not present. To generate it run:</p>
        <pre>cd frontend && npm install && npm run build</pre>
        <p>During development you can run the React dev server instead:</p>
        <pre>cd frontend && npm start</pre>
        <p>Then visit <a href='http://localhost:3000'>http://localhost:3000</a>.</p>
        <hr />
        <p>API root is under <code>/api/</code> (e.g. <code>/api/auth/token/</code>).</p>
        </body></html>""",
        content_type='text/html'
    )


def favicon_view(request):
    # Return empty 200 response to silence 404 noise; frontend supplies real favicon.
    return HttpResponse(status=204)

urlpatterns = [
    path('', root_view, name='home'),
    path('favicon.ico', favicon_view, name='favicon'),
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/health/', include('health.urls')),
    path('api/requests/', include('requestsapp.urls')),
    path('api/medications/', include('medications.urls')),
    path('api/timesheet/', include('timesheet.urls')),
    path('api/payments/', include('payments.urls')),
    # Optional: catch-all for client-side routing (uncomment if you want Django to serve SPA for any non-API path)
    # re_path(r'^(?!api/|admin/).*$' , root_view),
]
