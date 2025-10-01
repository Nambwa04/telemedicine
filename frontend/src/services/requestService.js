// requestService.js
// Now supports real backend integration, with in-memory fallback.
import { createApiClient } from './apiClient';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api';
const api = createApiClient(() => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }), API_BASE);

let _requests = [
    { id: 1, family: 'Johnson Family', service: 'Elder Care', duration: '3 months', rate: 25, unit: 'hour', urgent: true, status: 'new', notes: 'Assist with daily activities' },
    { id: 2, family: 'Brown Family', service: 'Post-Surgery Care', duration: '2 weeks', rate: 30, unit: 'hour', urgent: false, status: 'new', notes: 'Focus on mobility support' },
    { id: 3, family: 'Wilson Family', service: 'Companion Care', duration: '6 months', rate: 22, unit: 'hour', urgent: false, status: 'new', notes: 'Daily companionship and light chores' },
    { id: 4, family: 'Garcia Family', service: 'Medication Management', duration: '1 month', rate: 28, unit: 'hour', urgent: true, status: 'new', notes: 'Ensure meds at 8am and 8pm' }
];
let _idCounter = 5;

function delay(ms = 250) { return new Promise(r => setTimeout(r, ms)); }

export async function listRequests({ status } = {}) {
    try {
        const qs = status && status !== 'all' ? `?status=${status}` : '';
        return await api.get(`/requests/${qs}`);
    } catch (e) {
        await delay();
        let list = [..._requests];
        if (status && status !== 'all') list = list.filter(r => r.status === status);
        return list.sort((a, b) => a.id - b.id);
    }
}

export async function updateRequestStatus(id, status) {
    try {
        return await api.patch(`/requests/${id}/`, { status });
    } catch (e) {
        await delay();
        const idx = _requests.findIndex(r => r.id === id);
        if (idx === -1) throw new Error('Request not found');
        _requests[idx] = { ..._requests[idx], status };
        return _requests[idx];
    }
}

export async function addRequest(req) {
    try {
        return await api.post('/requests/', req);
    } catch (e) {
        await delay();
        const newReq = { id: _idCounter++, status: 'new', urgent: false, ...req };
        _requests.push(newReq);
        return newReq;
    }
}

export async function deleteRequest(id) {
    try {
        await api.del(`/requests/${id}/`);
        return true;
    } catch (e) {
        await delay();
        _requests = _requests.filter(r => r.id !== id);
        return true;
    }
}
