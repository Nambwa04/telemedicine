import { createApiClient } from './apiClient';
import API_BASE from '../config';

// appointmentService.js
// Production version: all data comes from backend API. Removed previous mock/fallback layer.
// Each appointment returned to UI is normalized with patientName & patientId fields for existing components.

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

// Fetch doctors from backend
export async function listDoctors() {
    // /accounts/doctors/ endpoint returns a list of doctor users
    const raw = await api.get('/accounts/doctors/');
    // If paginated
    if (raw && Object.prototype.hasOwnProperty.call(raw, 'results')) {
        return raw.results;
    }
    return Array.isArray(raw) ? raw : [];
}
// Each appointment returned to UI is normalized with patientName & patientId fields for existing components.

function mapAppointment(a) {
    // Backend serializer returns patient & doctor nested userSimple objects
    const patientId = a.patient?.id ?? a.patient_id ?? a.patientId;
    const patientName = a.patient ? `${a.patient.first_name || ''} ${a.patient.last_name || ''}`.trim() || a.patient.email : a.patientName;
    return {
        ...a,
        patientId,
        patientName
    };
}

export async function listAppointments({ date, page } = {}) {
    const qs = new URLSearchParams();
    if (date) qs.set('date', date);
    if (page) qs.set('page', page);
    const raw = await api.get(`/appointments/${qs.toString() ? `?${qs}` : ''}`);
    if (raw && Object.prototype.hasOwnProperty.call(raw, 'results')) {
        return {
            items: raw.results.map(mapAppointment),
            meta: { count: raw.count, next: raw.next, previous: raw.previous }
        };
    }
    const arr = Array.isArray(raw) ? raw.map(mapAppointment) : [];
    return { items: arr, meta: { count: arr.length, next: null, previous: null } };
}

export async function createAppointment({ date, time, patientId, doctorId, type, notes }) {
    const body = { date, time, type, notes, patient_id: patientId };
    if (doctorId) body.doctor_id = doctorId; else {
        // fallback: if logged in doctor creating appointment for patient, set themselves
        const authUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (authUser?.role === 'doctor') body.doctor_id = authUser.id;
    }
    const created = await api.post('/appointments/', body);
    return mapAppointment(created);
}

export async function updateAppointment(id, patch) {
    // Normalize camelCase to snake_case for backend serializer
    const norm = { ...patch };
    if (Object.prototype.hasOwnProperty.call(norm, 'patientId')) {
        norm.patient_id = norm.patientId;
        delete norm.patientId;
    }
    if (Object.prototype.hasOwnProperty.call(norm, 'doctorId')) {
        norm.doctor_id = norm.doctorId;
        delete norm.doctorId;
    }
    // Ensure time is in HH:MM (drop seconds if present)
    if (typeof norm.time === 'string') {
        norm.time = norm.time.slice(0, 5);
    }
    const updated = await api.patch(`/appointments/${id}/`, norm);
    return mapAppointment(updated);
}

export async function cancelAppointment(id) {
    return updateAppointment(id, { status: 'cancelled' });
}

export async function deleteAppointment(id) {
    await api.del(`/appointments/${id}/`);
    return true;
}

// No mock or local state retained—source of truth is server.

// Join video consultation (returns { video_link })
export async function joinVideoConsultation(id) {
    return api.get(`/appointments/${id}/join_video/`);
}

// Cancel appointment using backend action endpoint
export async function cancelAppointmentAction(id) {
    return api.post(`/appointments/${id}/cancel_appointment/`);
}
