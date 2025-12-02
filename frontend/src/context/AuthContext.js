/**
 * Authentication Context Provider.
 * Manages user authentication state, login, logout, registration, and token refreshing.
 * Provides auth context to the entire application.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import API_BASE from '../config';

/**
 * Helper function to safely parse JSON responses.
 * It handles cases where the response might be HTML (e.g., 404 or 500 errors from a web server)
 * instead of JSON, providing a clearer error message.
 * 
 * @param {Response} res - The fetch API response object
 * @returns {Promise<Object>} - The parsed JSON data
 */
async function parseJsonResponse(res) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        return res.json();
    }
    // Not JSON: read a small preview to aid debugging
    const text = await res.text();
    const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(`Expected JSON but received '${ct || 'unknown'}' (status ${res.status}). Preview: ${preview}`);
}

// Create the Authentication Context
const AuthContext = createContext();

/**
 * Custom hook to access the AuthContext.
 * Must be used within an AuthProvider component.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * AuthProvider component that wraps the application.
 * It manages the user's authentication state (login, logout, register, etc.)
 * and provides this state to all child components.
 */
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Initialize auth state from local storage on mount
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

    /**
     * Saves the user object to state and local storage.
     * @param {Object} payload - The user object to save
     */
    const saveUser = (payload) => {
        setUser(payload);
        localStorage.setItem('user', JSON.stringify(payload));
    };

    /**
     * Fetches the current user's profile from the backend.
     * @param {string} access - The access token
     * @returns {Promise<Object>} - The user profile data
     */
    const fetchMe = async (access) => {
        const res = await fetch(`${API_BASE}/accounts/me/`, { headers: { Authorization: `Bearer ${access}` } });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return await parseJsonResponse(res);
    };

    /**
     * Refreshes the access token using the refresh token.
     * If successful, updates the user state with the new access token.
     * If failed, logs the user out.
     */
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
            const data = await parseJsonResponse(res);
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

    /**
     * Logs in the user with email and password.
     * @param {Object} credentials - { email, password }
     */
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
                try { const errJson = await parseJsonResponse(tokenRes); detail = errJson.detail || detail; } catch (e) { detail = e.message || detail; }
                throw new Error(detail);
            }
            const tokens = await parseJsonResponse(tokenRes);
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

    /**
     * Registers a new user.
     * @param {Object} userData - User registration data
     */
    const register = async ({ email, role, password, username, first_name, last_name, primary_condition, phone }) => {
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
                    username: username || undefined, // Let backend generate if undefined
                    first_name: first_name || '',
                    last_name: last_name || '',
                    primary_condition: primary_condition || '',
                    phone: phone || ''
                })
            });
            if (!res.ok) {
                let msg = 'Registration failed';
                try { const errJson = await parseJsonResponse(res); msg = errJson.detail || msg; } catch (e) { msg = e.message || msg; }
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

    /**
     * Logs in or registers a user using Google OAuth.
     * @param {string} credential - The Google JWT credential
     * @param {string} role - The role to assign if creating a new user
     */
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
                try { const errJson = await parseJsonResponse(res); msg = errJson.detail || msg; } catch (e) { msg = e.message || msg; }
                throw new Error(msg);
            }

            const data = await parseJsonResponse(res);
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

    /**
     * Logs out the current user by clearing state and local storage.
     */
    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    /**
     * Updates the current user's profile data.
     * @param {Object} updatedUserData - The data to update
     */
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
                    const errJson = await parseJsonResponse(res);
                    // DRF returns { field: ["error", ...], ... } or { detail: "..." }
                    if (errJson.detail) msg = errJson.detail;
                    fieldErrors = errJson;
                } catch { /* ignore parse error */ }
                const err = new Error(msg);
                err.fieldErrors = fieldErrors;
                throw err;
            }
            const fresh = await parseJsonResponse(res);
            const merged = { ...user, ...fresh };
            saveUser(merged);
            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message || 'Update failed', fieldErrors: error.fieldErrors };
        }
    };

    /**
     * Refreshes the user profile from the backend to ensure local state is up to date.
     */
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