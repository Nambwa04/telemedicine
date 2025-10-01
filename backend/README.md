# Django Backend for Telemedicine Frontend

## Overview

This backend provides RESTful APIs for authentication (JWT), appointments, health metrics, caregiver requests, and medications to replace the current mock services in the React frontend.

## Stack

- Django 5
- Django REST Framework
- Simple JWT
- django-cors-headers
- SQLite (default) – swap out easily for Postgres/MySQL in production

## Apps

| App          | Purpose                                                  |
| ------------ | -------------------------------------------------------- |
| accounts     | Custom user model with roles: patient, doctor, caregiver |
| appointments | CRUD for appointments (patient↔doctor)                   |
| health       | Vital readings, symptoms, labs                           |
| requestsapp  | Caregiver service requests                               |
| medications  | Patient medications                                      |

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows PowerShell
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py createsuperuser  # optional
python backend/manage.py runserver
```

Server runs at: http://127.0.0.1:8000/

## Auth

Obtain token:
POST /api/auth/token/ {"email": "user@example.com", "password": "Pass123!"}
Refresh token:
POST /api/auth/token/refresh/
Register:
POST /api/accounts/register/
Me:
GET /api/accounts/me/

Include header:
Authorization: Bearer <access_token>

## Endpoints (summary)

| Resource        | Base Path             | Notes                                  |
| --------------- | --------------------- | -------------------------------------- |
| Appointments    | /api/appointments/    | Filtered to user role (patient/doctor) |
| Vital Readings  | /api/health/vitals/   | Patient auto-assigned                  |
| Symptoms        | /api/health/symptoms/ | Patient auto-assigned                  |
| Lab Results     | /api/health/labs/     | Patient auto-assigned                  |
| Health Overview | /api/health/overview/ | Aggregated patient metrics             |
| Care Requests   | /api/requests/        | Basic CRUD                             |
| Medications     | /api/medications/     | Patient-limited                        |

## Frontend Integration

Replace mock service functions with real fetch calls using a base URL:

```js
const BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000/api";
```

Example (appointments list with filtering & pagination):

```js
const res = await fetch(`${BASE}/appointments/?date=2025-09-30&page=1`, {
  headers: { Authorization: `Bearer ${access}` },
});
const data = await res.json(); // data.results contains page items
```

Create appointment:

```js
await fetch(`${BASE}/appointments/`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access}`,
  },
  body: JSON.stringify({ date, time, type, notes, patient_id, doctor_id }),
});
```

## Running Tests

```bash
python backend/manage.py test
```

## Recent Enhancements

- Added pagination, ordering & filtering to appointments
- Health overview aggregation endpoint
- Care request permission restrictions (write: caregiver/doctor)
- Frontend token-based auth & silent refresh scaffolding
- CI pipeline (GitHub Actions) for backend tests & frontend build

## Next Steps / Potential Enhancements

- Patient list & doctor-specific patient filtering endpoint
- Email verification & password reset
- WebRTC signaling server (e.g., Django Channels) for video consultations
- Rate limiting & auditing
- Improved trends analytics server-side

## Environment Variables

| Variable             | Purpose             | Default             |
| -------------------- | ------------------- | ------------------- |
| DJANGO_SECRET_KEY    | Security key        | dev-insecure-secret |
| DJANGO_DEBUG         | Debug flag          | 1                   |
| DJANGO_ALLOWED_HOSTS | Comma list of hosts | localhost,127.0.0.1 |

## Newly Added Endpoints

| Resource     | Path                    | Notes                                |
| ------------ | ----------------------- | ------------------------------------ |
| Patient List | /api/accounts/patients/ | List patients (intended for doctors) |
| Profile (me) | /api/accounts/me/       | PATCH supports first_name, last_name |

Example profile update:

```bash
curl -X PATCH \
  -H "Authorization: Bearer <ACCESS>" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Alice","last_name":"Smith"}' \
  http://127.0.0.1:8000/api/accounts/me/
```

## Security Extensions

| Purpose                    | Method | Path                                  | Body                                         | Notes                                                          |
| -------------------------- | ------ | ------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Request Email Verification | POST   | /api/accounts/email/verify/request/   | {"email":"user@example.com"}                 | Returns `token` in dev for testing (would be emailed in prod). |
| Confirm Email Verification | POST   | /api/accounts/email/verify/confirm/   | {"token":"uuid"}                             | Marks user active & consumes token.                            |
| Request Password Reset     | POST   | /api/accounts/password/reset/request/ | {"email":"user@example.com"}                 | Issues password reset token (dev only returns).                |
| Confirm Password Reset     | POST   | /api/accounts/password/reset/confirm/ | {"token":"uuid","new_password":"Strong123!"} | Updates password & consumes token.                             |

Rate limits (see `REST_FRAMEWORK`): `email_verify` & `password_reset` => `5/hour` each. Adjust in `settings.py`.

## Real-time & Roadmap

Planned (not yet implemented):

1. WebSocket layer (Django Channels) for:
   - Live vital streaming (group per patient: `vitals_<patient_id>`)
   - Appointment status updates
2. WebRTC signaling endpoint: minimal JSON messages over `/ws/video/<room>/` for SDP & ICE relay.
3. Push notifications (Service Worker) for reminders & abnormal vital alerts.
4. Background tasks (Celery) for scheduled trend computation & email digests.

These are deferred until core auth & security flows stabilize.
