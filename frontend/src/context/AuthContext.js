import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api';

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

    const register = async ({ email, role, password, username }) => {
        setAuthError(null);
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/accounts/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, password, username: username || email.split('@')[0] })
            });
            if (!res.ok) {
                let msg = 'Registration failed';
                try { const errJson = await res.json(); msg = errJson.detail || msg; } catch { /* ignore */ }
                throw new Error(msg);
            }
            // Do NOT auto login now; caller will redirect to /login
            setLoading(false);
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            setLoading(false);
            setAuthError(error.message || 'Registration failed');
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
            const res = await fetch(`${API_BASE}/accounts/me/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.access}` }, body: JSON.stringify(updatedUserData) });
            if (!res.ok) throw new Error('Update failed');
            const fresh = await res.json();
            const merged = { ...user, ...fresh };
            saveUser(merged);
            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        updateUser,
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