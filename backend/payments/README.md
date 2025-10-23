# Payments (Safaricom Daraja) Overview

This app implements M-PESA B2C payouts for the caregiver marketplace, following the strategic blueprint.

API endpoints (prefix: /api/payments/):

- POST b2c/payout (admin only): Initiate a payout to a caregiver
- POST b2c/result: ResultURL callback from Daraja (unauthenticated)
- POST b2c/timeout: QueueTimeOutURL callback (unauthenticated)

Environment (.env) keys required:

- DARAJA_ENV=sandbox|production
- DARAJA_CONSUMER_KEY=...
- DARAJA_CONSUMER_SECRET=...
- DARAJA_B2C_SHORTCODE=...
- DARAJA_INITIATOR_NAME=...
- DARAJA_INITIATOR_PASSWORD=...
- DARAJA_CERT_PATH=absolute path to Safaricom public certificate (.cer)
- DARAJA_CALLBACK_BASE_URL=https://your.public.domain

Notes:

- Ensure DARAJA_CALLBACK_BASE_URL is publicly reachable over HTTPS for callbacks.
- SecurityCredential uses RSA encryption (PKCS#1 v1.5) with Safaricom public cert.
- In sandbox, you still need a certificate file to generate SecurityCredential.
