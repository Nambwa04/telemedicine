import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats] = useState({
        upcomingAppointments: 2,
        activeMedications: 3,
        healthAlerts: 1,
        caregiverRequests: 0
    });

    const [recentActivity] = useState([
        { id: 1, type: 'appointment', message: 'Appointment with Dr. Smith scheduled for tomorrow', time: '2 hours ago', icon: 'calendar' },
        { id: 2, type: 'medication', message: 'Medication reminder: Take Lisinopril', time: '4 hours ago', icon: 'pills' },
        { id: 3, type: 'alert', message: 'Blood pressure reading uploaded', time: '1 day ago', icon: 'heartbeat' }
    ]);

    const [quickActions] = useState([
        { title: 'Book Appointment', icon: 'calendar-plus', accent: 'blue-theme', link: '/appointments' },
        { title: 'Video Consultation', icon: 'video', accent: 'blue-theme', link: '/video-call' },
        { title: 'Medication Tracker', icon: 'pills', accent: 'blue-theme', link: '/medications' },
        { title: 'Find Caregiver', icon: 'user-nurse', accent: 'blue-theme', link: '/caregivers' },
        { title: 'Health Dashboard', icon: 'file-medical', accent: 'blue-theme', link: '/health-dashboard' },
        { title: 'Emergency Contact', icon: 'phone', accent: 'blue-theme', link: '/emergency' }
    ]);

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user" className="me-3" />
                            Welcome back, {user.name}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Your health is our priority</p>
                    </Col>
                </Row>
            </div>

            {/* Health Alerts */}
            {stats.healthAlerts > 0 && (
                <Alert variant="warning" className="alert-custom mb-4">
                    <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                    You have {stats.healthAlerts} health alert(s) that need attention.{' '}
                    <Alert.Link href="/health-alerts">View details</Alert.Link>
                </Alert>
            )}

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="calendar" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.upcomingAppointments}</span>
                            <div className="stat-label">Upcoming Appointments</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="pills" className="text-success mb-3" size="2x" />
                            <span className="stat-number">{stats.activeMedications}</span>
                            <div className="stat-label">Active Medications</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="heartbeat" className="text-danger mb-3" size="2x" />
                            <span className="stat-number">{stats.healthAlerts}</span>
                            <div className="stat-label">Health Alerts</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="user-nurse" className="text-info mb-3" size="2x" />
                            <span className="stat-number">{stats.caregiverRequests}</span>
                            <div className="stat-label">Caregiver Requests</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Quick Actions */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                {quickActions.map((action, index) => (
                                    <Col lg={4} md={6} className="mb-3" key={index}>
                                        <QuickActionTile
                                            icon={action.icon}
                                            label={action.title}
                                            accent={action.accent}
                                            onClick={() => {
                                                if (action.link === '/video-call') {
                                                    const room = 'room_' + user.id;
                                                    navigate(`/video-call?room=${room}`);
                                                } else {
                                                    navigate(action.link);
                                                }
                                            }}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Activity */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="history" className="me-2" />
                            Recent Activity
                        </Card.Header>
                        <Card.Body>
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="activity-tile d-flex align-items-start mb-3 p-3 rounded">
                                    <div className="me-3 activity-icon-wrapper">
                                        <FontAwesomeIcon
                                            icon={activity.icon}
                                            className={`activity-icon ${activity.type}`}
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <p className="mb-1 small fw-medium">{activity.message}</p>
                                        <small className="text-muted">{activity.time}</small>
                                    </div>
                                    {activity.type === 'alert' && (
                                        <Badge bg="danger" className="soft-badge ms-2">Alert</Badge>
                                    )}
                                </div>
                            ))}
                            <Button variant="link" className="p-0 text-primary">
                                View all activity
                                <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Patient list intentionally excluded from patient dashboard; schedule & metrics section removed per request */}
        </Container>
    );
};

export default PatientDashboard;