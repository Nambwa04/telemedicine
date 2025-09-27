import React, { createContext, useContext, useState, useEffect } from 'react';

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

    useEffect(() => {
        // Check if user is logged in (from localStorage or API)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            const mockUser = {
                id: 1,
                email: credentials.email,
                role: credentials.role,
                name: credentials.name || 'User',
                avatar: null
            };

            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            const mockUser = {
                id: Date.now(),
                email: userData.email,
                role: userData.role,
                name: userData.name,
                avatar: null
            };

            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
            setLoading(false);
            return { success: true };
        } catch (error) {
            setLoading(false);
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
            // TODO: Replace with actual API call
            const updatedUser = {
                ...user,
                ...updatedUserData
            };

            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
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
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
export { AuthProvider };