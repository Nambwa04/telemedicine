
/**
 * Service for admin operations.
 * Handles user management (doctors, patients, caregivers), verification, and analytics.
 */
import { createApiClient } from './apiClient';
import API_BASE from '../config';
const apiClient = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

// Admin registration
export function registerAdmin(data) {
    return apiClient.post('/accounts/admin/register/', data);
}

// List all users
export function fetchAllUsers() {
    return apiClient.get('/accounts/admin/users/');
}

// ===== Doctor CRUD =====
export function createDoctor(data) {
    return apiClient.post('/accounts/admin/doctors/create/', data);
}

export function updateDoctor(doctorId, data) {
    return apiClient.patch(`/accounts/admin/doctors/${doctorId}/update/`, data);
}

export function deleteDoctor(doctorId) {
    return apiClient.delete(`/accounts/admin/doctors/${doctorId}/delete/`);
}

export function verifyDoctor(doctorId, isVerified) {
    const body = (typeof isVerified === 'undefined') ? {} : { is_verified: !!isVerified };
    return apiClient.post(`/accounts/admin/doctors/${doctorId}/verify/`, body);
}

// ===== Patient CRUD =====
export function createPatient(data) {
    return apiClient.post('/accounts/admin/patients/create/', data);
}

export function updatePatient(patientId, data) {
    return apiClient.patch(`/accounts/admin/patients/${patientId}/update/`, data);
}

export function deletePatient(patientId) {
    return apiClient.delete(`/accounts/admin/patients/${patientId}/delete/`);
}

// ===== Caregiver CRUD =====
export function createCaregiver(data) {
    return apiClient.post('/accounts/admin/caregivers/create/', data);
}

export function updateCaregiver(caregiverId, data) {
    return apiClient.patch(`/accounts/admin/caregivers/${caregiverId}/update/`, data);
}

export function deleteCaregiver(caregiverId) {
    return apiClient.delete(`/accounts/admin/caregivers/${caregiverId}/delete/`);
}

// ===== Caregiver Verification =====
export function verifyCaregiver(caregiverId, isVerified) {
    // If isVerified is undefined, backend will toggle; otherwise set explicitly
    const body = (typeof isVerified === 'undefined') ? {} : { is_verified: !!isVerified };
    return apiClient.post(`/accounts/admin/caregivers/${caregiverId}/verify/`, body);
}

// ===== Analytics =====
export function fetchAnalytics(queryString = '') {
    const suffix = queryString ? (queryString.startsWith('?') ? queryString : `?${queryString}`) : '';
    return apiClient.get(`/accounts/admin/analytics/${suffix}`);
}

// ===== Appointments Management =====
export function fetchAllAppointments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.date) params.append('date', filters.date);
    if (filters.doctor) params.append('doctor', filters.doctor);
    if (filters.patient) params.append('patient', filters.patient);

    const queryString = params.toString();
    return apiClient.get(`/accounts/admin/appointments/${queryString ? '?' + queryString : ''}`);
}


