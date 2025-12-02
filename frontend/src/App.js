/**
 * Main Application Component.
 * Handles routing, authentication context, and global layout structure.
 * Manages role-based access control and dashboard redirection.
 */
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

// Import components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PasswordReset from './pages/PasswordReset';
import PatientDashboard from './components/Dashboard/PatientDashboard';
import DoctorDashboard from './components/Dashboard/DoctorDashboard';
import CaregiverDashboard from './components/Dashboard/CaregiverDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import Navbar from './components/Common/Navbar';
import Sidebar from './components/Common/Sidebar';
import ProtectedRoute from './components/Common/ProtectedRoute';
import AuthProvider from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import MedicationTracking from './components/Medications/MedicationTracking';
import CaregiverMarketplace from './components/Caregivers/CaregiverMarketplace';
import DoctorMarketplace from './pages/DoctorMarketplace';
import AssignmentRequests from './pages/AssignmentRequests';
import PatientHealthDashboard from './components/HealthDashboard/PatientHealthDashboard';
import ProfileManagement from './components/Profile/ProfileManagement';
import PatientListPage from './pages/PatientListPage';
import CaregiverClientsPage from './pages/CaregiverClientsPage';
import AppointmentsWrapper from './components/Appointments/AppointmentsWrapper';
import RequestsPage from './pages/RequestsPage';
import VideoConsultation from './components/VideoCall/VideoConsultation';
import './App.css';
import HomePage from './pages/HomePage';
import TimesheetPage from './pages/TimesheetPage';
import FollowUpsPage from './pages/FollowUpsPage';
import { useAuth } from './context/AuthContext';
import { useLocation } from 'react-router-dom';
import './styles/sidebar.css';

// Add FontAwesome icons
library.add(fas);

function App() {
  // Helper component to decide what to render at root based on auth
  const RootRoute = () => {
    const { user } = useAuth();
    if (user) {
      const roleMap = { patient: '/patient-dashboard', doctor: '/doctor-dashboard', caregiver: '/caregiver-dashboard', admin: '/admin-dashboard' };
      return <Navigate to={roleMap[user.role] || '/patient-dashboard'} replace />;
    }
    return <HomePage />;
  };

  // Component controlling top nav vs sidebar
  const RouteDecider = ({ onHamburger }) => {
    const { user } = useAuth();
    const location = useLocation();
    const publicPaths = ['/', '/login', '/register'];
    const noSidebarPaths = ['/video-call', '/video-calls'];
    const isPublic = publicPaths.includes(location.pathname);
    const noSidebar = noSidebarPaths.includes(location.pathname);
    if (user && !isPublic && !noSidebar) {
      // Provide minimal top bar only for mobile hamburger (could be improved later)
      return (
        <>
          <button className="d-lg-none mobile-menu-btn" onClick={onHamburger} aria-label="Open menu">
            ☰
          </button>
          <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        </>
      );
    }
    // Hide Navbar entirely on video pages for a distraction-free experience
    if (!isPublic && noSidebar) {
      return null;
    }
    return <Navbar />;
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  // Wrapper component to apply or remove sidebar spacing (kept for future use)
  // Note: currently unused by Routes/JSX but useful for layout changes later
  const MainWrapper = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const publicPaths = ['/', '/login', '/register'];
    const noSidebarPaths = ['/video-call', '/video-calls'];
    const isPublic = publicPaths.includes(location.pathname);
    const noSidebar = noSidebarPaths.includes(location.pathname);
    const hasSidebar = Boolean(user) && !isPublic && !noSidebar;
    const cls = 'main-content' + (hasSidebar ? ' with-sidebar' : '');
    return <main className={cls}>{children}</main>;
  };

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App app-layout">
            {/* Decide if we are on a dashboard route to show sidebar instead of top navbar */}
            <RouteDecider onHamburger={() => setMobileOpen(true)} />
            {mobileOpen && <div className="sidebar-overlay d-lg-none" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" />}
            <MainWrapper>
              <Container fluid>
                <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/password-reset" element={<PasswordReset />} />

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
                    path="/assignment-requests"
                    element={
                      <ProtectedRoute requiredRole="doctor">
                        <AssignmentRequests />
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

                  {/* Admin Dashboard */}
                  <Route
                    path="/admin-dashboard"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Caregiver Requests */}
                  <Route
                    path="/requests"
                    element={
                      <ProtectedRoute requiredRole="caregiver">
                        <RequestsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Video Calls */}
                  <Route
                    path="/video-calls"
                    element={
                      <ProtectedRoute>
                        <VideoConsultation />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/video-call"
                    element={
                      <ProtectedRoute>
                        <VideoConsultation />
                      </ProtectedRoute>
                    }
                  />

                  {/* Appointments / Schedule */}
                  <Route
                    path="/appointments"
                    element={
                      <ProtectedRoute>
                        <AppointmentsWrapper />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/schedule"
                    element={
                      <ProtectedRoute requiredRole="caregiver">
                        <AppointmentsWrapper />
                      </ProtectedRoute>
                    }
                  />

                  {/* Patient / Client list pages */}
                  <Route
                    path="/patients"
                    element={
                      <ProtectedRoute requiredRole="doctor">
                        <PatientListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <ProtectedRoute requiredRole="caregiver">
                        <CaregiverClientsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Routes - accessible by all authenticated users */}
                  <Route
                    path="/medications"
                    element={
                      <ProtectedRoute>
                        <MedicationTracking />
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
                    path="/doctors"
                    element={
                      <ProtectedRoute>
                        <DoctorMarketplace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/health-dashboard"
                    element={
                      <ProtectedRoute>
                        {/* Patient specific dashboard now; keep shared for future multi-role usage */}
                        <PatientHealthDashboard />
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
                  <Route
                    path="/timesheet"
                    element={<TimesheetPage />}
                  />
                  <Route
                    path="/caregiver/timesheet"
                    element={
                      <ProtectedRoute requiredRole="caregiver">
                        <TimesheetPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Follow-Ups (caregiver/doctor) */}
                  <Route
                    path="/follow-ups"
                    element={
                      <ProtectedRoute>
                        <FollowUpsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback unmatched routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Container>
            </MainWrapper>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
