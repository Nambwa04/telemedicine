/**
 * Centralized API Client.
 * Wraps fetch with automatic token injection and refresh logic.
 * Provides methods for GET, POST, PATCH, DELETE requests.
 */
import { useAuth } from '../context/AuthContext';

export function createApiClient(getAuth, API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api', { onError } = {}) {
    async function request(path, { method = 'GET', body, headers = {}, retry = true } = {}) {
        const auth = getAuth();
        const access = auth?.user?.access;
        const isFormData = (typeof FormData !== 'undefined') && body instanceof FormData;
        const finalHeaders = isFormData ? { ...headers } : { 'Content-Type': 'application/json', ...headers };
        if (access) finalHeaders.Authorization = `Bearer ${access}`;
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers: finalHeaders,
            body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
        });
        if (res.status === 401 && retry && auth?.refreshToken) {
            const newAccess = await auth.refreshToken();
            if (newAccess) {
                return request(path, { method, body, headers, retry: false });
            }
        }
        if (!res.ok) {
            const text = await res.text();
            const err = new Error(text || 'API error');
            if (onError) onError(err, { path, method, status: res.status });
            throw err;
        }
        if (res.status === 204) return null;
        return res.json();
    }

    return {
        get: (p) => request(p),
        post: (p, b) => request(p, { method: 'POST', body: b }),
        patch: (p, b) => request(p, { method: 'PATCH', body: b }),
        del: (p) => request(p, { method: 'DELETE' }),
        // Alias for compatibility with existing services that call `delete`
        delete: (p) => request(p, { method: 'DELETE' }),
    };
}

// Hook factory if needed later
export function useApiClient(options) {
    const auth = useAuth();
    return createApiClient(() => auth, undefined, options);
}
