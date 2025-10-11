// prescriptionService.js
// Handles API calls for prescriptions (medications)
import { createApiClient } from './apiClient';
import API_BASE from '../config';

// Create API client with proper auth retrieval
const getAuth = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return { user: null, refreshToken: async () => null };

    try {
        const user = JSON.parse(userStr);
        return {
            user,
            refreshToken: async () => {
                // Refresh token logic
                if (!user.refresh) return null;
                const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: user.refresh })
                });
                if (!res.ok) return null;
                const data = await res.json();
                const updated = { ...user, access: data.access };
                localStorage.setItem('user', JSON.stringify(updated));
                return data.access;
            }
        };
    } catch (e) {
        return { user: null, refreshToken: async () => null };
    }
};

const api = createApiClient(getAuth, API_BASE);

export async function createPrescription({ patient_id, name, dosage, frequency, next_due, total_quantity, remaining_quantity, refill_threshold, start_date, end_date }) {
    return api.post('/medications/prescriptions/', {
        patient_id,
        name,
        dosage,
        frequency,
        next_due,
        total_quantity: total_quantity || 0,
        remaining_quantity: remaining_quantity || total_quantity || 0,
        refill_threshold: refill_threshold || 7,
        start_date,
        end_date
    });
}

export async function fetchPrescriptions(patientId) {
    // If patientId is provided, filter by patient
    const qs = patientId ? `?patient=${patientId}` : '';
    return api.get(`/medications/prescriptions/${qs}`);
}

export async function logMedicationIntake(medicationId, data) {
    // POST /medications/{id}/log-intake/
    return api.post(`/medications/${medicationId}/log-intake/`, data);
}

export async function getMedicationLogs(medicationId) {
    // GET /medications/{id}/logs/
    return api.get(`/medications/${medicationId}/logs/`);
}

export async function refillMedication(medicationId, quantity) {
    // POST /medications/{id}/refill/
    return api.post(`/medications/${medicationId}/refill/`, { quantity });
}

