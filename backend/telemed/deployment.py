import os 
from .settings import *
from .settings import BASE_DIR

# Allow running in CI/local where Azure env vars are missing
_HOSTNAME = os.getenv('WEBSITE_HOSTNAME')
if _HOSTNAME:
    ALLOWED_HOSTS = [_HOSTNAME]
    CSRF_TRUSTED_ORIGINS = [f'https://{_HOSTNAME}']
    import sys
    print(f"Production mode: ALLOWED_HOSTS={ALLOWED_HOSTS}", file=sys.stderr)
else:
    # Safe defaults for non-Azure environments (CI/local build)
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']
    CSRF_TRUSTED_ORIGINS = []
    import sys
    print("WARNING: WEBSITE_HOSTNAME not set, using localhost defaults", file=sys.stderr)

DEBUG = False
# Use MY_SECRET_KEY if provided, otherwise keep the base settings SECRET_KEY
SECRET_KEY = os.getenv('MY_SECRET_KEY', SECRET_KEY)

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'telemed.error_logging_middleware.ErrorLoggingMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "https://telemedplusfrontend.z1.web.core.windows.net"
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# Configure Postgres only when Azure connection string is present; otherwise
# inherit DATABASES from base settings (likely sqlite for local/CI)
_CONNECTION = os.getenv('AZURE_POSTGRESQL_CONNECTIONSTRING')
if _CONNECTION:
    try:
        CONNECTION_STR = {pair.split('=')[0]: pair.split('=')[1] for pair in _CONNECTION.split(' ') if '=' in pair}
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": CONNECTION_STR.get('dbname', ''),
                "HOST": CONNECTION_STR.get('host', ''),
                "USER": CONNECTION_STR.get('user', ''),
                "PASSWORD": CONNECTION_STR.get('password', ''),
                "OPTIONS": {
                    'connect_timeout': 10,
                    'options': '-c statement_timeout=30000'
                },
            }
        }
        # Validate that all required fields are present
        if not all([CONNECTION_STR.get('dbname'), CONNECTION_STR.get('host'), 
                   CONNECTION_STR.get('user'), CONNECTION_STR.get('password')]):
            import sys
            print("ERROR: Incomplete database connection string", file=sys.stderr)
            print(f"Missing fields in connection string", file=sys.stderr)
    except Exception as e:
        import sys
        print(f"ERROR: Failed to parse AZURE_POSTGRESQL_CONNECTIONSTRING: {e}", file=sys.stderr)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}



ADMINS = [("Nambwa", "nambwaberyl2018@gmail.com")]

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_PASSWORD')
DEFAULT_FROM_EMAIL = 'default from email'



STATIC_ROOT = BASE_DIR/'staticfiles'

# --- Redis cache (Azure) ---

def _normalize_azure_redis(raw: str) -> str:
    raw = raw.strip()
    # If already a redis URL, return as-is
    if raw.startswith("redis://") or raw.startswith("rediss://"):
        return raw
    # Azure style: host:port,password=...,ssl=True,abortConnect=False
    parts = raw.split(",")
    host_port = parts[0]
    if ":" in host_port:
        host, port = host_port.split(":", 1)
    else:
        host, port = host_port, "6379"
    kv = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            kv[k.strip().lower()] = v.strip()
    password = kv.get("password", "")
    scheme = "rediss" if kv.get("ssl", "true").lower() == "true" else "redis"
    # default db 0
    return f"{scheme}://:{password}@{host}:{port}/0"

RAW_REDIS = os.environ.get("AZURE_REDIS_CONNECTIONSTRING")

if RAW_REDIS:
    try:
        REDIS_URL = _normalize_azure_redis(RAW_REDIS)
        CACHES = {
            "default": {
                "BACKEND": "django_redis.cache.RedisCache",
                "LOCATION": REDIS_URL,
                "OPTIONS": {
                    "CLIENT_CLASS": "django_redis.client.DefaultClient",
                    # Azure Redis over TLS (6380) often needs relaxed cert checks in PaaS
                    "CONNECTION_POOL_KWARGS": {"ssl_cert_reqs": None},
                },
                "KEY_PREFIX": "telemed",
                "TIMEOUT": 300,
            }
        }
        # Use cached DB sessions for speed with DB fallback
        SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
    except Exception:
        # Fallback to in-memory cache if parsing fails
        CACHES = {
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "telemed",
                "TIMEOUT": 300,
            }
        }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "telemed",
            "TIMEOUT": 300,
        }
    }