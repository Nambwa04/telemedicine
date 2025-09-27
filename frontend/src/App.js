import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Import components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PatientDashboard from './components/Dashboard/PatientDashboard';
import DoctorDashboard from './components/Dashboard/DoctorDashboard';
import CaregiverDashboard from './components/Dashboard/CaregiverDashboard';
import Navbar from './components/Common/Navbar';
import ProtectedRoute from './components/Common/ProtectedRoute';
import AuthProvider from './context/AuthContext';

import MedicationManagement from './components/Medications/MedicationManagement';
import CaregiverMarketplace from './components/Caregivers/CaregiverMarketplace';
import SharedHealthDashboard from './components/HealthDashboard/SharedHealthDashboard';
import ProfileManagement from './components/Profile/ProfileManagement';
import './App.css';

// Add FontAwesome icons
library.add(fas);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Container fluid>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/patient-dashboard"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor-dashboard"
                  element={
                    <ProtectedRoute requiredRole="doctor">
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caregiver-dashboard"
                  element={
                    <ProtectedRoute requiredRole="caregiver">
                      <CaregiverDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Shared Routes - accessible by all authenticated users */}
                <Route
                  path="/medications"
                  element={
                    <ProtectedRoute>
                      <MedicationManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caregivers"
                  element={
                    <ProtectedRoute>
                      <CaregiverMarketplace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/health-dashboard"
                  element={
                    <ProtectedRoute>
                      <SharedHealthDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Default route */}
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Container>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
