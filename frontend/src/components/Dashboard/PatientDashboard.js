import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        upcomingAppointments: 2,
        activeMedications: 3,
        healthAlerts: 1,
        caregiverRequests: 0
    });

    const [recentActivity, setRecentActivity] = useState([
        { id: 1, type: 'appointment', message: 'Appointment with Dr. Smith scheduled for tomorrow', time: '2 hours ago', icon: 'calendar' },
        { id: 2, type: 'medication', message: 'Medication reminder: Take Lisinopril', time: '4 hours ago', icon: 'pills' },
        { id: 3, type: 'alert', message: 'Blood pressure reading uploaded', time: '1 day ago', icon: 'heartbeat' }
    ]);

    const [quickActions] = useState([
        { title: 'Book Appointment', icon: 'calendar-plus', color: 'primary', link: '/appointments' },
        { title: 'Video Consultation', icon: 'video', color: 'success', link: '/video-call' },
        { title: 'Medication Tracker', icon: 'pills', color: 'info', link: '/medications' },
        { title: 'Find Caregiver', icon: 'user-nurse', color: 'warning', link: '/caregivers' },
        { title: 'Health Records', icon: 'file-medical', color: 'secondary', link: '/health-records' },
        { title: 'Emergency Contact', icon: 'phone', color: 'danger', link: '/emergency' }
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
                                        <Button
                                            variant={action.color}
                                            className="w-100 py-3"
                                            style={{ borderRadius: '12px' }}
                                        >
                                            <div className="d-flex flex-column align-items-center">
                                                <FontAwesomeIcon icon={action.icon} size="lg" className="mb-2" />
                                                <span>{action.title}</span>
                                            </div>
                                        </Button>
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
                                <div key={activity.id} className="d-flex align-items-start mb-3 p-2 rounded bg-light">
                                    <div className="me-3">
                                        <FontAwesomeIcon
                                            icon={activity.icon}
                                            className={`text-${activity.type === 'appointment' ? 'primary' :
                                                    activity.type === 'medication' ? 'success' : 'danger'
                                                }`}
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <p className="mb-1 small">{activity.message}</p>
                                        <small className="text-muted">{activity.time}</small>
                                    </div>
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

            {/* Today's Schedule */}
            <Row>
                <Col lg={6} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="clock" className="me-2" />
                            Today's Schedule
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex align-items-center justify-content-between p-3 mb-2 bg-light rounded">
                                <div>
                                    <h6 className="mb-1">Dr. Sarah Johnson</h6>
                                    <small className="text-muted">Cardiology Consultation</small>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold text-primary">2:00 PM</div>
                                    <Button size="sm" variant="outline-success" className="mt-1">
                                        <FontAwesomeIcon icon="video" className="me-1" />
                                        Join Call
                                    </Button>
                                </div>
                            </div>
                            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                                <div>
                                    <h6 className="mb-1">Medication Reminder</h6>
                                    <small className="text-muted">Lisinopril 10mg</small>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold text-warning">6:00 PM</div>
                                    <Button size="sm" variant="outline-primary" className="mt-1">
                                        <FontAwesomeIcon icon="check" className="me-1" />
                                        Mark Taken
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Health Metrics */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="chart-line" className="me-2" />
                            Health Metrics
                        </Card.Header>
                        <Card.Body>
                            <Row className="text-center">
                                <Col md={4} className="mb-3">
                                    <div className="p-3">
                                        <FontAwesomeIcon icon="heartbeat" className="text-danger mb-2" size="lg" />
                                        <div className="fw-bold">120/80</div>
                                        <small className="text-muted">Blood Pressure</small>
                                    </div>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <div className="p-3">
                                        <FontAwesomeIcon icon="weight" className="text-success mb-2" size="lg" />
                                        <div className="fw-bold">68 kg</div>
                                        <small className="text-muted">Weight</small>
                                    </div>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <div className="p-3">
                                        <FontAwesomeIcon icon="thermometer-half" className="text-info mb-2" size="lg" />
                                        <div className="fw-bold">98.6°F</div>
                                        <small className="text-muted">Temperature</small>
                                    </div>
                                </Col>
                            </Row>
                            <Button variant="outline-primary" className="w-100">
                                <FontAwesomeIcon icon="plus" className="me-2" />
                                Add New Reading
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default PatientDashboard;