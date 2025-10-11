// healthService.js
// Now supports real backend integration. Falls back to mock if API_BASE unreachable.
import { createApiClient } from './apiClient';
import API_BASE from '../config';
const api = createApiClient(() => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }), API_BASE);

export async function fetchPatientMetrics(patientId) {
    try {
        const qs = patientId ? `?patient_id=${patientId}` : '';
        return await api.get(`/health/overview/${qs}`);
    } catch (e) {
        console.warn('Falling back to mock health metrics', e.message);
        await new Promise(r => setTimeout(r, 300));
        return { patientId, overview: {}, vitals: [], medications: [], labResults: [], symptoms: [], appointments: [] };
    }
}

export async function fetchPatientList(search) {
    try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        const raw = await api.get(`/accounts/patients/${qs}`);
        // Handle paginated response: use raw.results if present, else raw
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);
        return data.map(u => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            condition: u.primary_condition || null
        }));
    } catch (e) {
        console.warn('Patient list fetch failed', e.message);
        return [];
    }
}

export async function fetchDoctorList(search) {
    try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        const raw = await api.get(`/accounts/doctors/${qs}`);
        return (Array.isArray(raw) ? raw : []).map(u => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
        }));
    } catch (e) {
        console.warn('Doctor list fetch failed', e.message);
        return [];
    }
}

export function mapTrendLabel(trend) {
    switch (trend) {
        case 'improving': return { icon: 'arrow-up', color: 'success', text: 'Improving' };
        case 'stable': return { icon: 'minus', color: 'primary', text: 'Stable' };
        case 'declining': return { icon: 'arrow-down', color: 'danger', text: 'Declining' };
        case 'normal': return { icon: 'check', color: 'success', text: 'Normal' };
        case 'abnormally high': return { icon: 'exclamation-triangle', color: 'danger', text: 'Abnormally High' };
        case 'abnormally low': return { icon: 'exclamation-triangle', color: 'warning', text: 'Abnormally Low' };
        case 'unknown': return { icon: 'question', color: 'secondary', text: 'No Data' };
        default: return { icon: 'question', color: 'secondary', text: 'Unknown' };
    }
}
