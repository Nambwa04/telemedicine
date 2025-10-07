// requestService.js
// Production-only version (no mock fallback). All operations rely on backend CareRequest endpoints.
import { createApiClient } from './apiClient';
import API_BASE from '../config';
const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

export async function listRequests({ status } = {}) {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api.get(`/requests/${qs}`);
    return Array.isArray(data) ? data : (data.results || []); // in case pagination added later
}

export async function updateRequestStatus(id, status) {
    return await api.patch(`/requests/${id}/`, { status });
}

export async function addRequest(req) {
    // Ensure default status new unless provided
    const body = { status: 'new', urgent: false, ...req };
    return await api.post('/requests/', body);
}

export async function deleteRequest(id) {
    await api.del(`/requests/${id}/`);
    return true;
}
