import { createApiClient } from './apiClient';
import API_BASE from '../config';

const apiClient = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

export function uploadMyVerificationDocument({ file, doc_type, note }) {
    const form = new FormData();
    form.append('file', file);
    if (doc_type) form.append('doc_type', doc_type);
    if (note) form.append('note', note);
    return apiClient.post('/accounts/me/verification-documents/', form);
}

export function listUserVerificationDocuments(userId) {
    return apiClient.get(`/accounts/admin/users/${userId}/verification-documents/`);
}

export function reviewVerificationDocument(docId, decision, review_note) {
    const body = { decision };
    if (review_note) body.review_note = review_note;
    return apiClient.post(`/accounts/admin/verification-documents/${docId}/review/`, body);
}
