import React from 'react';
import { useAuth } from '../../context/AuthContext';
import PatientAppointments from '../Appointments/PatientAppointments';
import AppointmentsPage from '../../pages/AppointmentsPage';

const AppointmentsWrapper = () => {
    const { user } = useAuth();

    // Show patient-friendly card view for patients
    if (user && user.role === 'patient') {
        return <PatientAppointments />;
    }

    // Show table view for doctors, caregivers, and admins
    return <AppointmentsPage />;
};

export default AppointmentsWrapper;
