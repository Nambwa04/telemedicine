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