/**
 * Service for medication and prescription management.
 * Handles creating prescriptions, logging intake, refills, and compliance tracking.
 * Also manages medication-related follow-ups and risk assessment.
 */
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
    const data = await api.get(`/medications/prescriptions/${qs}`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
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

// ===== Compliance & Risk =====
export async function getMedicationRisk(medicationId) {
    // GET /medications/{id}/risk/
    return api.get(`/medications/${medicationId}/risk/`);
}

export async function listAtRiskMedications() {
    // GET /medications/at-risk/
    const data = await api.get(`/medications/at-risk/`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
}

export async function createMedicationFollowUp(
    medicationId,
    { reason = 'high_risk', notes = '', scheduled_at, date, time, doctor_id } = {}
) {
    // POST /medications/{id}/create-followup/
    const body = { reason, notes };
    if (scheduled_at) body.scheduled_at = scheduled_at;
    if (date && time) {
        body.date = date; body.time = time;
    }
    if (doctor_id) body.doctor_id = doctor_id;
    return api.post(`/medications/${medicationId}/create-followup/`, body);
}

export async function scanAndCreateFollowUps() {
    // POST /medications/scan-and-followups/
    return api.post(`/medications/scan-and-followups/`, {});
}

// Follow-up resources
export async function listFollowUps() {
    // GET /medications/followups/
    const data = await api.get(`/medications/followups/`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
}

export async function completeFollowUp(followupId) {
    // POST /medications/followups/{id}/complete/
    return api.post(`/medications/followups/${followupId}/complete/`);
}

export async function cancelFollowUp(followupId) {
    // POST /medications/followups/{id}/cancel/
    return api.post(`/medications/followups/${followupId}/cancel/`);
}

