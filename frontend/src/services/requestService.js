/**
 * Service for managing care requests.
 * Handles listing, creating, updating status, and deleting care requests.
 * Maps status updates to specific backend action endpoints.
 */
import { createApiClient } from './apiClient';
import API_BASE from '../config';
const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

export async function listRequests({ status } = {}) {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api.get(`/requests/care/${qs}`);
    return Array.isArray(data) ? data : (data.results || []); // supports pagination shape
}

export async function updateRequestStatus(id, status) {
    // Use explicit backend transitions where applicable
    const actionMap = {
        'accepted': () => api.post(`/requests/care/${id}/accept/`, {}),
        'declined': () => api.post(`/requests/care/${id}/decline/`, {}),
        'in-progress': () => api.post(`/requests/care/${id}/start/`, {}),
        'completed': () => api.post(`/requests/care/${id}/complete/`, {}),
    };
    if (actionMap[status]) return await actionMap[status]();
    // Fallback for non-status edits
    return await api.patch(`/requests/care/${id}/`, { status });
}

export async function addRequest(req) {
    // Ensure default status new unless provided; backend sets created_by automatically
    const body = { status: 'new', urgent: false, ...req };
    return await api.post('/requests/care/', body);
}

export async function deleteRequest(id) {
    await api.del(`/requests/care/${id}/`);
    return true;
}
