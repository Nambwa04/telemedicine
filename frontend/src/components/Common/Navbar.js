import React from 'react';
import { Navbar, Nav, NavDropdown, Container, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const NavigationBar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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

    return (
        <Navbar bg="white" expand="lg" fixed="top" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to={user ? getDashboardLink() : '/login'} className="fw-bold text-primary">
                    <FontAwesomeIcon icon="heartbeat" className="me-2" />
                    TeleMed+
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    {user ? (
                        <>
                            <Nav className="me-auto">
                                <Nav.Link as={Link} to={getDashboardLink()}>
                                    <FontAwesomeIcon icon="tachometer-alt" className="me-1" />
                                    Dashboard
                                </Nav.Link>

                                {user.role === 'patient' && (
                                    <>
                                        <Nav.Link as={Link} to="/appointments">
                                            <FontAwesomeIcon icon="calendar" className="me-1" />
                                            Appointments
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/medications">
                                            <FontAwesomeIcon icon="pills" className="me-1" />
                                            Medications
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/caregivers">
                                            <FontAwesomeIcon icon="user-nurse" className="me-1" />
                                            Find Caregivers
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/health-dashboard">
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}

                                {user.role === 'doctor' && (
                                    <>
                                        <Nav.Link as={Link} to="/patients">
                                            <FontAwesomeIcon icon="users" className="me-1" />
                                            Patients
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/appointments">
                                            <FontAwesomeIcon icon="calendar" className="me-1" />
                                            Schedule
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/video-calls">
                                            <FontAwesomeIcon icon="video" className="me-1" />
                                            Video Calls
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/health-dashboard">
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}

                                {user.role === 'caregiver' && (
                                    <>
                                        <Nav.Link as={Link} to="/clients">
                                            <FontAwesomeIcon icon="users" className="me-1" />
                                            Clients
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/requests">
                                            <FontAwesomeIcon icon="clipboard-list" className="me-1" />
                                            Requests
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/schedule">
                                            <FontAwesomeIcon icon="calendar-alt" className="me-1" />
                                            Schedule
                                        </Nav.Link>
                                        <Nav.Link as={Link} to="/health-dashboard">
                                            <FontAwesomeIcon icon="chart-line" className="me-1" />
                                            Health Dashboard
                                        </Nav.Link>
                                    </>
                                )}
                            </Nav>

                            <Nav>
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
                        <Nav className="ms-auto">
                            <Button as={Link} to="/login" variant="outline-primary" className="me-2">
                                Login
                            </Button>
                            <Button as={Link} to="/register" variant="primary">
                                Register
                            </Button>
                        </Nav>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;