// appointmentService.js
// Currently uses mock in-memory data. To switch to real backend:
// 1. Set REACT_APP_API_BASE in .env (e.g., http://127.0.0.1:8000/api)
// 2. Replace list/create/update/delete functions with fetch calls (see TODO blocks)

import { createApiClient } from './apiClient';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api';
const api = createApiClient(() => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }), API_BASE);

let _appointments = [
    { id: 1, date: '2025-09-28', time: '09:00', patientId: 101, patientName: 'John Doe', type: 'Follow-up', status: 'scheduled', notes: 'Blood pressure review' },
    { id: 2, date: '2025-09-28', time: '10:30', patientId: 102, patientName: 'Jane Miller', type: 'Consultation', status: 'scheduled', notes: 'Discuss A1C results' },
    { id: 3, date: '2025-09-29', time: '14:00', patientId: 103, patientName: 'Carlos Ruiz', type: 'Check-up', status: 'scheduled', notes: 'Asthma control assessment' }
];
let _idCounter = 4;

function delay(ms = 250) { return new Promise(r => setTimeout(r, ms)); }

export async function listAppointments({ date, page } = {}) {
    if (API_BASE) {
        const qs = new URLSearchParams();
        if (date) qs.set('date', date);
        if (page) qs.set('page', page);
        const raw = await api.get(`/appointments/${qs.toString() ? `?${qs}` : ''}`);
        // If backend pagination returns DRF structure
        if (raw && Object.prototype.hasOwnProperty.call(raw, 'results')) {
            return {
                items: raw.results,
                meta: { count: raw.count, next: raw.next, previous: raw.previous }
            };
        }
        // Fallback: treat raw as array
        return { items: Array.isArray(raw) ? raw : [], meta: { count: Array.isArray(raw) ? raw.length : 0, next: null, previous: null } };
    }
    await delay();
    let list = date ? _appointments.filter(a => a.date === date) : [..._appointments];
    list = list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return { items: list, meta: { count: list.length, next: null, previous: null } };
}

export async function createAppointment({ date, time, patientId, patientName, type, notes }) {
    if (API_BASE) {
        const body = { date, time, type, notes, patient_id: patientId, doctor_id: patientId === 101 ? 1 : 1 /* FIXME choose doctor */ };
        return await api.post('/appointments/', body);
    }
    await delay();
    const newAppt = { id: _idCounter++, date, time, patientId, patientName, type, notes: notes || '', status: 'scheduled' };
    _appointments.push(newAppt);
    return newAppt;
}

export async function updateAppointment(id, patch) {
    if (API_BASE) {
        return await api.patch(`/appointments/${id}/`, patch);
    }
    await delay();
    const idx = _appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    _appointments[idx] = { ..._appointments[idx], ...patch };
    return _appointments[idx];
}

export async function cancelAppointment(id) {
    return updateAppointment(id, { status: 'cancelled' });
}

export async function deleteAppointment(id) {
    if (API_BASE) {
        await api.del(`/appointments/${id}/`);
        return true;
    }
    await delay();
    _appointments = _appointments.filter(a => a.id !== id);
    return true;
}

// authHeader removed; apiClient handles token injection
