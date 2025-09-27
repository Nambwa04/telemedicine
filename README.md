# telemedicine

## Overview

Telemedicine platform providing role-based dashboards for patients, doctors, and caregivers.

## Features

- User Authentication (Patients, Doctors, Caregivers)
- Role-specific Dashboards
- Appointment Management (placeholder)
- Medication Tracking (placeholder)
- Caregiver Marketplace (placeholder)
- Patient-Specific Health Dashboard (new)
- Profile Management (placeholder)
- Video Consultation integration scaffold (ZegoCloud-ready)

## Patient-Specific Health Dashboard

File: `frontend/src/components/HealthDashboard/PatientHealthDashboard.js`

Highlights:

1. Personalized metrics loaded via `healthService.js` (mock service).
2. Overview cards (vitals + medication count) adapt to mock trends.
3. Tabs: Vitals, Medications, Labs, Symptoms, Appointments.
4. For non-patient roles (future doctor/caregiver view) a Patient List tab appears allowing switching between patients.
5. Insights section placeholder for future analytics.

Service Layer: `frontend/src/services/healthService.js`

- `fetchPatientMetrics(patientId)` returns mock structured data.
- `fetchPatientList()` supplies a mock patient roster.
- `mapTrendLabel(trend)` maps trend keywords to icon/color/text.

Route Change:
`/health-dashboard` now renders `PatientHealthDashboard` instead of the generic `SharedHealthDashboard`.

Patient Dashboard Quick Actions:

- Updated to navigate to `/health-dashboard` (renamed from Health Records) and open video call with deterministic room id.

## Next Steps (Suggestions)

- Replace mock service with real API endpoints (create backend routes: `/api/patients/:id/metrics`, `/api/patients` etc.).
- Persist vitals and symptoms data entry forms.
- Add role-based authorization checks on backend.
- Integrate real-time updates (WebSocket) for vitals streaming.
- Add charts for weight and glucose trends.

## Development

Install frontend dependencies:

```bash
cd frontend
npm install
npm start
```

## License

Internal / TBD
