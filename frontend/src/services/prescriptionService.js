// prescriptionService.js
// Handles API calls for prescriptions (medications)
import { createApiClient } from './apiClient';
import API_BASE from '../config';
const api = createApiClient(() => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }), API_BASE);

export async function createPrescription({ patient, name, dosage, frequency, next_due }) {
    return api.post('/medications/', { patient, name, dosage, frequency, next_due });
}

export async function fetchPrescriptions(patientId) {
    // If patientId is provided, filter by patient
    const qs = patientId ? `?patient=${patientId}` : '';
    return api.get(`/medications/${qs}`);
}
