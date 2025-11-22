import React, { useEffect, useState } from 'react';
import { Navbar, Nav, NavDropdown, Container, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, NavLink, useLocation } from 'react-router-dom';
import { listRequests } from '../../services/requestService';
import { useTheme } from '../../context/ThemeContext';

const NavigationBar = () => {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const [newRequestsCount, setNewRequestsCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        const dashboardMap = {
            'patient': '/patient-dashboard',
            'doctor': '/doctor-dashboard',
            'caregiver': '/caregiver-dashboard'
        };
        return dashboardMap[user.role] || '/login';
    };

    useEffect(() => {
        let active = true;
        async function loadNewRequests() {
            if (user?.role !== 'caregiver') return;
            try {
                const all = await listRequests({ status: 'all' });
                if (!active) return;
                const count = all.filter(r => r.status === 'new').length;
                setNewRequestsCount(count);
            } catch (e) {
                // swallow silently for now
            }
        }
        loadNewRequests();
        const interval = setInterval(loadNewRequests, 30000); // refresh every 30s
        return () => { active = false; clearInterval(interval); };
    }, [user]);

    return (
        <Navbar bg={dark ? "dark" : "white"} variant={dark ? "dark" : "light"} expand="false" fixed="top" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to={user ? getDashboardLink() : '/'} className="fw-bold text-primary">
                    <FontAwesomeIcon icon="heartbeat" className="me-2" />
                    TeleMed+
                </Navbar.Brand>

                {/* Auth Buttons - Always Visible */}
                {!user && (
                    <div className="d-flex align-items-center gap-2 ms-auto">
                        <Button as={Link} to="/login" variant="outline-primary" size="sm">
                            Login
                        </Button>
                        <Button as={Link} to="/register" variant="primary" size="sm">
                            Register
                        </Button>
                    </div>
                )}

                {/* Hamburger Toggle Button - After Auth Buttons */}
                <Navbar.Toggle aria-controls="basic-navbar-nav" className="ms-2">
                    <span className="navbar-toggler-icon"></span>
                </Navbar.Toggle>

                {/* Collapsible Menu Content */}
                <Navbar.Collapse id="basic-navbar-nav">
                    {user ? (
                        <>
                            <Nav className="me-auto">
                                <Nav.Link
                                    as={NavLink}
                                    to={getDashboardLink()}
                                    className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}
                                    end
                                >
                                    <FontAwesomeIcon icon="tachometer-alt" className="me-1" />
                                    Dashboard
                                </Nav.Link>

                                {user.role === 'patient' && (
                                    <>
                                        <Nav.Link as={NavLink} to="/appointments" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="calendar" className="me-1" />
                                            Appointments
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/medications" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="pills" className="me-1" />
                                            Medications
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/caregivers" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="user-nurse" className="me-1" />
                                            Find Caregivers
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/health-dashboard" className={({ isActive }) => isActive || location.pathname.startsWith('/health-dashboard') ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}

                                {user.role === 'doctor' && (
                                    <>
                                        <Nav.Link as={NavLink} to="/patients" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="users" className="me-1" />
                                            Patients
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/appointments" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="calendar" className="me-1" />
                                            Schedule
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/video-calls" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="video" className="me-1" />
                                            Video Calls
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/health-dashboard" className={({ isActive }) => isActive || location.pathname.startsWith('/health-dashboard') ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}

                                {user.role === 'caregiver' && (
                                    <>
                                        <Nav.Link as={NavLink} to="/clients" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="users" className="me-1" />
                                            Clients
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/requests" className={({ isActive }) => (isActive ? 'active fw-semibold ' : '') + 'd-flex align-items-center gap-1'}>
                                            <FontAwesomeIcon icon="clipboard-list" className="me-1" />
                                            <span className="d-inline-flex align-items-center">
                                                Requests
                                                {newRequestsCount > 0 && (
                                                    <Badge bg="danger" pill className="ms-1 request-count-badge">
                                                        {newRequestsCount}
                                                    </Badge>
                                                )}
                                            </span>
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/schedule" className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="calendar-alt" className="me-1" />
                                            Schedule
                                        </Nav.Link>
                                        <Nav.Link as={NavLink} to="/health-dashboard" className={({ isActive }) => isActive || location.pathname.startsWith('/health-dashboard') ? 'active fw-semibold' : undefined}>
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}
                            </Nav>

                            <Nav className="align-items-lg-center gap-2">
                                <Button
                                    variant={dark ? 'outline-light' : 'outline-secondary'}
                                    size="sm"
                                    onClick={toggle}
                                    aria-label="Toggle dark mode"
                                    className="d-flex align-items-center"
                                >
                                    <FontAwesomeIcon icon={dark ? 'sun' : 'moon'} className="me-1" />
                                    <span className="d-none d-md-inline">{dark ? 'Light' : 'Dark'}</span>
                                </Button>
                                <NavDropdown
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon="user-circle" className="me-1" />
                                            {user.name}
                                        </span>
                                    }
                                    id="user-nav-dropdown"
                                >
                                    <NavDropdown.Item as={Link} to="/profile">
                                        <FontAwesomeIcon icon="user-edit" className="me-2" />
                                        Profile
                                    </NavDropdown.Item>
                                    <NavDropdown.Item as={Link} to="/settings">
                                        <FontAwesomeIcon icon="cog" className="me-2" />
                                        Settings
                                    </NavDropdown.Item>
                                    <NavDropdown.Divider />
                                    <NavDropdown.Item onClick={handleLogout}>
                                        <FontAwesomeIcon icon="sign-out-alt" className="me-2" />
                                        Logout
                                    </NavDropdown.Item>
                                </NavDropdown>
                            </Nav>
                        </>
                    ) : (
                        <Nav className="flex-column">
                            <Nav.Link as={NavLink} to="/" end className={({ isActive }) => isActive ? 'active fw-semibold' : undefined}>
                                <FontAwesomeIcon icon="home" className="me-2" />
                                Home
                            </Nav.Link>
                            
                            {/* Theme Toggle */}
                            <div className="nav-link" style={{ cursor: 'pointer' }} onClick={toggle}>
                                <FontAwesomeIcon icon={dark ? 'sun' : 'moon'} className="me-2" />
                                <span>{dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                            </div>
                        </Nav>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;