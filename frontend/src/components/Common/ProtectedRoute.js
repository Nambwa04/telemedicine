import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to appropriate dashboard based on user role
        const dashboardMap = {
            'patient': '/patient-dashboard',
            'doctor': '/doctor-dashboard',
            'caregiver': '/caregiver-dashboard'
        };
        return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;