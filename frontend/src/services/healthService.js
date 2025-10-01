// healthService.js
// Now supports real backend integration. Falls back to mock if API_BASE unreachable.
import { createApiClient } from './apiClient';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api';
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
        return await api.get(`/accounts/patients/${qs}`);
    } catch (e) {
        console.warn('Falling back to empty patient list', e.message);
        return [];
    }
}

export function mapTrendLabel(trend) {
    switch (trend) {
        case 'improving': return { icon: 'arrow-up', color: 'success', text: 'Improving' };
        case 'stable': return { icon: 'minus', color: 'primary', text: 'Stable' };
        case 'declining': return { icon: 'arrow-down', color: 'danger', text: 'Declining' };
        case 'normal': return { icon: 'check', color: 'success', text: 'Normal' };
        default: return { icon: 'question', color: 'secondary', text: 'Unknown' };
    }
}
