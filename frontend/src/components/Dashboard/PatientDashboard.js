import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { fetchPatientMetrics } from '../../services/healthService';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        upcomingAppointments: 0,
        activeMedications: 0,
        healthAlerts: 0,
        caregiverRequests: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            if (!user) return;
            setLoading(true);
            try {
                const metrics = await fetchPatientMetrics(user.id);
                setStats({
                    upcomingAppointments: Array.isArray(metrics.appointments) ? metrics.appointments.length : 0,
                    activeMedications: Array.isArray(metrics.medications) ? metrics.medications.length : 0,
                    healthAlerts: Array.isArray(metrics.symptoms) ? metrics.symptoms.filter(s => s.severity >= 4).length : 0,
                    caregiverRequests: 0 // Adjust if you have this data in metrics
                });

                // Build recent activity from backend data
                const activities = [];

                // Add recent appointments
                if (Array.isArray(metrics.appointments) && metrics.appointments.length > 0) {
                    metrics.appointments.slice(0, 2).forEach(appt => {
                        const apptDate = new Date(appt.date);
                        const now = new Date();
                        const diffMs = apptDate - now;
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        let timeText = '';
                        if (diffDays === 0) timeText = 'Today';
                        else if (diffDays === 1) timeText = 'Tomorrow';
                        else if (diffDays > 0) timeText = `In ${diffDays} days`;
                        else timeText = `${Math.abs(diffDays)} days ago`;

                        activities.push({
                            id: `appt-${appt.date}`,
                            type: 'appointment',
                            message: `Appointment with ${appt.doctor || 'Doctor'}${appt.type ? ` - ${appt.type}` : ''}`,
                            time: timeText,
                            icon: 'calendar'
                        });
                    });
                }

                // Add recent vitals
                if (Array.isArray(metrics.vitals) && metrics.vitals.length > 0) {
                    const latestVital = metrics.vitals[0];
                    const vitalDate = new Date(latestVital.date);
                    const now = new Date();
                    const diffMs = now - vitalDate;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    let timeText = '';
                    if (diffHours < 1) timeText = 'Just now';
                    else if (diffHours < 24) timeText = `${diffHours}h ago`;
                    else timeText = `${diffDays}d ago`;

                    activities.push({
                        id: `vital-${latestVital.date}`,
                        type: 'vital',
                        message: 'Vital signs recorded',
                        time: timeText,
                        icon: 'heartbeat'
                    });
                }

                // Add recent medications
                if (Array.isArray(metrics.medications) && metrics.medications.length > 0) {
                    const activeMeds = metrics.medications.slice(0, 1);
                    activeMeds.forEach(med => {
                        activities.push({
                            id: `med-${med.name}`,
                            type: 'medication',
                            message: `Medication: ${med.name} - ${med.dosage || 'Take as prescribed'}`,
                            time: 'Active',
                            icon: 'pills'
                        });
                    });
                }

                // Add recent symptoms (as alerts)
                if (Array.isArray(metrics.symptoms) && metrics.symptoms.length > 0) {
                    metrics.symptoms.slice(0, 1).forEach(symptom => {
                        const symptomDate = new Date(symptom.date);
                        const now = new Date();
                        const diffMs = now - symptomDate;
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        let timeText = '';
                        if (diffDays === 0) timeText = 'Today';
                        else timeText = `${diffDays}d ago`;

                        activities.push({
                            id: `symptom-${symptom.date}`,
                            type: 'alert',
                            message: `Symptom logged: ${symptom.symptom || 'Health concern'}`,
                            time: timeText,
                            icon: 'notes-medical'
                        });
                    });
                }

                // Sort by most recent and limit to 5
                setRecentActivity(activities.slice(0, 5));
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [user]);

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
                            <FontAwesomeIcon icon="user-md" className="me-3" />
                            {user && user.first_name && user.last_name && typeof user.first_name === 'string' && typeof user.last_name === 'string' ? (
                                <>{getGreeting()}, {user.first_name} {user.last_name}!</>
                            ) : user && user.name && typeof user.name === 'string' ? (
                                <>{getGreeting()}, {user.name}!</>
                            ) : (
                                <>{getGreeting()}, Patient!</>
                            )}
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Ready to make a difference today</p>
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
                            <FontAwesomeIcon icon="pills" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.activeMedications}</span>
                            <div className="stat-label">Active Medications</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="heartbeat" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.healthAlerts}</span>
                            <div className="stat-label">Health Alerts</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="user-nurse" className="text-primary mb-3" size="2x" />
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
                        <Card.Header className="bg-white border-bottom" style={{ color: '#000', fontWeight: '600' }}>
                            <h5 className="mb-0" style={{ color: '#000' }}>
                                <FontAwesomeIcon icon="bolt" className="me-2 text-primary" />
                                Quick Actions
                            </h5>
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
                        <Card.Header className="bg-white border-bottom" style={{ color: '#000', fontWeight: '600' }}>
                            <h5 className="mb-0" style={{ color: '#000' }}>
                                <FontAwesomeIcon icon="history" className="me-2 text-primary" />
                                Recent Activity
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2 text-muted small">Loading recent activity...</p>
                                </div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <FontAwesomeIcon icon="history" size="2x" className="mb-3 opacity-50" />
                                    <p>No recent activity</p>
                                    <small>Your health activities will appear here</small>
                                </div>
                            ) : (
                                <>
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
                                    <Button
                                        variant="link"
                                        className="p-0 text-primary"
                                        onClick={() => navigate('/health-dashboard')}
                                    >
                                        View all activity
                                        <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                                    </Button>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Patient list intentionally excluded from patient dashboard; schedule & metrics section removed per request */}
        </Container>
    );
};

export default PatientDashboard;