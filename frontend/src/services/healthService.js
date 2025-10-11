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
        // Get current user to check role
        const user = JSON.parse(localStorage.getItem('user') || 'null');

        // If caregiver, fetch only their active clients from service requests
        if (user && user.role === 'caregiver') {
            // Import caregiverService to get active clients
            const { listCareRequests } = await import('./caregiverService');
            const allRequests = await listCareRequests();

            // Filter for active requests (accepted/in-progress)
            const activeStatuses = ['accepted', 'in-progress'];
            const activeRequests = allRequests.filter(req =>
                activeStatuses.includes(req.status)
            );

            // Extract unique clients and map to expected format
            const seen = new Set();
            const clients = activeRequests
                .filter(req => req.family)
                .filter(req => {
                    if (seen.has(req.family)) return false;
                    seen.add(req.family);
                    return true;
                })
                .map((req, index) => ({
                    id: req.id || index,
                    name: req.family,
                    condition: null // Service requests don't have condition info
                }));

            return clients;
        }

        // For doctors/admins, fetch all patients from backend
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
