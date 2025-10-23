import base64
import json
import time
from dataclasses import dataclass
from typing import Optional, Tuple

import requests
from django.conf import settings

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography import x509
except Exception:  # pragma: no cover - cryptography may be missing until installed
    serialization = None
    padding = None
    hashes = None
    x509 = None


@dataclass
class DarajaAuth:
    access_token: str
    expires_at: float


_auth_cache: Optional[DarajaAuth] = None


def _base_url() -> str:
    if settings.DARAJA_ENV == 'production':
        return 'https://api.safaricom.co.ke'
    return 'https://sandbox.safaricom.co.ke'


def get_access_token() -> str:
    global _auth_cache
    now = time.time()
    if _auth_cache and _auth_cache.expires_at - 10 > now:
        return _auth_cache.access_token

    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=(settings.DARAJA_CONSUMER_KEY, settings.DARAJA_CONSUMER_SECRET), timeout=20)
    resp.raise_for_status()
    data = resp.json()
    token = data['access_token']
    expires_in = int(data.get('expires_in', 3599))
    _auth_cache = DarajaAuth(access_token=token, expires_at=now + expires_in)
    return token


def encrypt_initiator_password(plain: str) -> str:
    """Encrypt InitiatorPassword using Safaricom's production public certificate.
    Returns base64-encoded cipher text as SecurityCredential.
    """
    if not serialization:
        raise RuntimeError('cryptography package is required for SecurityCredential encryption')

    with open(settings.DARAJA_CERT_PATH, 'rb') as f:
        cert_bytes = f.read()

    public_key = None
    # Try as X.509 certificate first (PEM then DER)
    if x509 is not None:
        try:
            cert = x509.load_pem_x509_certificate(cert_bytes)
            public_key = cert.public_key()
        except Exception:
            try:
                cert = x509.load_der_x509_certificate(cert_bytes)
                public_key = cert.public_key()
            except Exception:
                public_key = None

    # Fallback: try raw public key (PEM then DER)
    if public_key is None:
        try:
            public_key = serialization.load_pem_public_key(cert_bytes)
        except Exception:
            public_key = serialization.load_der_public_key(cert_bytes)

    cipher = public_key.encrypt(
        plain.encode('utf-8'),
        padding.PKCS1v15()
    )
    return base64.b64encode(cipher).decode('utf-8')


def b2c_payment_request(*, amount: int, phone_number: str, remarks: str = '', command_id: str = 'BusinessPayment', queue_timeout_url: str = '', result_url: str = '') -> Tuple[int, dict]:
    token = get_access_token()
    url = f"{_base_url()}/mpesa/b2c/v1/paymentrequest"

    # SecurityCredential requires production cert even in sandbox as per docs/tools examples
    security_credential = encrypt_initiator_password(settings.DARAJA_INITIATOR_PASSWORD)

    payload = {
        "InitiatorName": settings.DARAJA_INITIATOR_NAME,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "Amount": amount,
        "PartyA": settings.DARAJA_B2C_SHORTCODE,
        "PartyB": phone_number,
        "Remarks": remarks or "Payout",
        "QueueTimeOutURL": queue_timeout_url,
        "ResultURL": result_url,
        "Occasion": ""
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    status = resp.status_code
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    if status >= 400:
        raise requests.HTTPError(f"Daraja B2C error {status}: {data}")
    return status, data
