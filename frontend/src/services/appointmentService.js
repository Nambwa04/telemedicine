// appointmentService.js
// Production version: all data comes from backend API. Removed previous mock/fallback layer.
// Each appointment returned to UI is normalized with patientName & patientId fields for existing components.

import { createApiClient } from './apiClient';
import API_BASE from '../config';
const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

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
    const updated = await api.patch(`/appointments/${id}/`, patch);
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
