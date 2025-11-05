import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import API_BASE from '../config';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setUser(parsed);
            } catch { /* ignore */ }
        }
        setLoading(false);
    }, []);

    const saveUser = (payload) => {
        setUser(payload);
        localStorage.setItem('user', JSON.stringify(payload));
    };

    const fetchMe = async (access) => {
        const res = await fetch(`${API_BASE}/accounts/me/`, { headers: { Authorization: `Bearer ${access}` } });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return await res.json();
    };

    const refreshToken = useCallback(async () => {
        try {
            const stored = localStorage.getItem('user');
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (!parsed.refresh) return null;
            const res = await fetch(`${API_BASE}/auth/token/refresh/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: parsed.refresh }) });
            if (!res.ok) {
                logout();
                return null;
            }
            const data = await res.json();
            const updated = { ...parsed, access: data.access };
            saveUser(updated);
            return updated.access;
        } catch (e) {
            return null;
        }
    }, []);

    // Silent refresh every 50 minutes (before 60 min expiry)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => { refreshToken(); }, 50 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, refreshToken]);

    const login = async ({ email, password }) => {
        setAuthError(null);
        try {
            setLoading(true);
            // Provide both email and username to satisfy SimpleJWT when USERNAME_FIELD switched to email
            const body = { email, username: email, password };
            const tokenRes = await fetch(`${API_BASE}/auth/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!tokenRes.ok) {
                let detail = 'Invalid credentials';
                try { const errJson = await tokenRes.json(); detail = errJson.detail || detail; } catch { /* ignore */ }
                throw new Error(detail);
            }
            const tokens = await tokenRes.json();
            const profile = await fetchMe(tokens.access);
            const authUser = { ...profile, access: tokens.access, refresh: tokens.refresh };
            saveUser(authUser);
            setLoading(false);
            return { success: true, user: authUser };
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false);
            setAuthError(error.message || 'Login failed');
            return { success: false, error: error.message };
        }
    };

    const register = async ({ email, role, password, username, first_name, last_name, primary_condition }) => {
        setAuthError(null);
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/accounts/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    role,
                    password,
                    username: username || email.split('@')[0],
                    first_name: first_name || '',
                    last_name: last_name || '',
                    primary_condition: primary_condition || ''
                })
            });
            if (!res.ok) {
                let msg = 'Registration failed';
                try { const errJson = await res.json(); msg = errJson.detail || msg; } catch { /* ignore */ }
                throw new Error(msg);
            }
            setLoading(false);
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            setLoading(false);
            setAuthError(error.message || 'Registration failed');
            return { success: false, error: error.message };
        }
    };

    const googleLogin = async (credential, role = 'patient') => {
        setAuthError(null);
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/accounts/google-auth/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential,
                    role
                })
            });

            if (!res.ok) {
                let msg = 'Google authentication failed';
                try { const errJson = await res.json(); msg = errJson.detail || msg; } catch { /* ignore */ }
                throw new Error(msg);
            }

            const data = await res.json();
            const authUser = { ...data.user, access: data.access, refresh: data.refresh };
            saveUser(authUser);
            setLoading(false);
            return { success: true, user: authUser };
        } catch (error) {
            console.error('Google login error:', error);
            setLoading(false);
            setAuthError(error.message || 'Google authentication failed');
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateUser = async (updatedUserData) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/accounts/me/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.access}` },
                body: JSON.stringify(updatedUserData)
            });
            if (!res.ok) {
                let msg = 'Update failed';
                let fieldErrors = null;
                try {
                    const errJson = await res.json();
                    // DRF returns { field: ["error", ...], ... } or { detail: "..." }
                    if (errJson.detail) msg = errJson.detail;
                    fieldErrors = errJson;
                } catch { /* ignore parse error */ }
                const err = new Error(msg);
                err.fieldErrors = fieldErrors;
                throw err;
            }
            const fresh = await res.json();
            const merged = { ...user, ...fresh };
            saveUser(merged);
            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message || 'Update failed', fieldErrors: error.fieldErrors };
        }
    };

    const refreshUserProfile = useCallback(async () => {
        try {
            if (!user || !user.access) return { success: false, error: 'Not authenticated' };
            const fresh = await fetchMe(user.access);
            const merged = { ...user, ...fresh };
            saveUser(merged);
            return { success: true, user: merged };
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
            return { success: false, error: error.message };
        }
    }, [user]);

    const value = {
        user,
        login,
        register,
        googleLogin,
        logout,
        updateUser,
        refreshUserProfile,
        loading,
        authError,
        refreshToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
export { AuthProvider };