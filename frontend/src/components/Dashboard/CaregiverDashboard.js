
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, ListGroup } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { fetchPatientList } from '../../services/healthService';

const CaregiverDashboard = () => {
    const { user } = useAuth();
    // Patient list state and fetch logic
    const [patients, setPatients] = useState([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientsError, setPatientsError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setPatientsLoading(true);
            setPatientsError(null);
            try {
                const list = await fetchPatientList();
                if (mounted) setPatients(list);
            } catch (e) {
                if (mounted) setPatientsError('Failed to load patients');
            } finally {
                if (mounted) setPatientsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const [serviceRequests] = useState([
        { id: 1, client: 'Johnson Family', service: 'Elder Care', duration: '3 months', rate: '$25/hour', urgent: true },
        { id: 2, client: 'Brown Family', service: 'Post-Surgery Care', duration: '2 weeks', rate: '$30/hour', urgent: false },
        { id: 3, client: 'Wilson Family', service: 'Companion Care', duration: '6 months', rate: '$22/hour', urgent: false }
    ]);

    const [recentMessages] = useState([
        { id: 1, from: 'Mrs. Anderson', message: 'Thank you for the excellent care yesterday!', time: '2 hours ago' },
        { id: 2, from: 'Thompson Family', message: "Can we reschedule tomorrow's appointment?", time: '4 hours ago' },
        { id: 3, from: 'Care Coordinator', message: 'New client match available in your area', time: '1 day ago' }
    ]);

    const [todaySchedule] = useState([
        { id: 1, time: '08:00 AM', client: 'Mrs. Anderson', service: 'Personal Care', location: '123 Oak St', status: 'completed' },
        { id: 2, time: '10:00 AM', client: 'Mr. Thompson', service: 'Medication Management', location: '456 Pine Ave', status: 'in-progress' },
        { id: 3, time: '02:00 PM', client: 'Mrs. Garcia', service: 'Companionship', location: '789 Maple Dr', status: 'scheduled' },
        { id: 4, time: '04:00 PM', client: 'Mr. Davis', service: 'Physical Therapy', location: '321 Elm St', status: 'scheduled' }
    ]);

    const getStatusBadge = (status) => {
        const map = {
            completed: { label: 'Completed', className: 'soft-badge bg-success-subtle text-success-emphasis' },
            'in-progress': { label: 'In Progress', className: 'soft-badge bg-warning-subtle text-warning-emphasis' },
            scheduled: { label: 'Scheduled', className: 'soft-badge bg-primary-subtle text-primary-emphasis' }
        };
        const meta = map[status] || { label: status, className: 'soft-badge bg-secondary-subtle text-secondary-emphasis' };
        return <span className={`badge rounded-pill ${meta.className}`}>{meta.label}</span>;
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-nurse" className="me-3" />
                            Welcome back, {user.name}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Making a difference in people's lives</p>
                    </Col>
                </Row>
            </div>

            {/* Patients List */}
            <Row>
                <Col lg={6} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-friends" className="me-2" />
                            Patients
                        </Card.Header>
                        <Card.Body>
                            {patientsLoading && <div className="text-center py-4">Loading patients...</div>}
                            {patientsError && <div className="text-danger py-2">{patientsError}</div>}
                            {!patientsLoading && !patientsError && patients.length === 0 && (
                                <div className="text-center py-4 text-muted">No patients found.</div>
                            )}
                            {!patientsLoading && !patientsError && patients.map(p => (
                                <div key={p.id} className="d-flex align-items-center justify-content-between p-3 mb-2 rounded bg-white shadow-sm patient-tile">
                                    <div>
                                        <h6 className="mb-1 fw-semibold">{p.name}</h6>
                                        <small className="text-muted d-block">{p.condition || <span className="text-muted">—</span>}</small>
                                    </div>
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Today's Schedule and Recent Messages */}
            <Row>
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Today's Schedule
                            </span>
                            <Button size="sm" className="gradient-primary">
                                <FontAwesomeIcon icon="route" className="me-1" />
                                Route
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Client</th>
                                        <th>Service</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todaySchedule.map((appointment) => (
                                        <tr key={appointment.id} className="align-middle">
                                            <td className="fw-bold text-nowrap">{appointment.time}</td>
                                            <td>{appointment.client}</td>
                                            <td>{appointment.service}</td>
                                            <td><small className="text-muted">{appointment.location}</small></td>
                                            <td>{getStatusBadge(appointment.status)}</td>
                                            <td>
                                                <div className="d-flex">
                                                    <button
                                                        className="icon-btn me-2"
                                                        aria-label={`Open map for ${appointment.client}`}
                                                    >
                                                        <FontAwesomeIcon icon="map-marker-alt" />
                                                    </button>
                                                    <button
                                                        className="icon-btn gradient-success"
                                                        aria-label={`Call ${appointment.client}`}
                                                    >
                                                        <FontAwesomeIcon icon="phone" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Messages */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="comments" className="me-2" />
                            Recent Messages
                        </Card.Header>
                        <Card.Body>
                            {recentMessages.map((message) => (
                                <div key={message.id} className="activity-tile d-flex align-items-start mb-3 p-3 rounded">
                                    <div className="me-3 activity-icon-wrapper">
                                        <FontAwesomeIcon icon="user-circle" className="activity-icon text-primary" size="lg" />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold small">{message.from}</div>
                                        <p className="mb-1 small">{message.message}</p>
                                        <small className="text-muted">{message.time}</small>
                                    </div>
                                </div>
                            ))}
                            <Button variant="link" className="p-0 text-primary">
                                View all messages
                                <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Service Requests and Quick Actions/Profile */}
            <Row>
                {/* Service Requests */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="clipboard-list" className="me-2" />
                            New Service Requests
                        </Card.Header>
                        <Card.Body>
                            {serviceRequests.map((request) => (
                                <Card key={request.id} className="mb-3 service-request-tile">
                                    <Card.Body>
                                        <Row className="align-items-center g-3">
                                            <Col md={8}>
                                                <div className="d-flex align-items-center mb-2 flex-wrap">
                                                    <h6 className="mb-0 me-2">{request.client}</h6>
                                                    {request.urgent && (
                                                        <Badge bg="danger" className="soft-badge">Urgent</Badge>
                                                    )}
                                                </div>
                                                <div className="small text-muted mb-1">{request.service} • {request.duration}</div>
                                                <div className="fw-medium">Rate: {request.rate}</div>
                                            </Col>
                                            <Col md={4} className="text-end">
                                                <Button size="sm" className="gradient-success me-2">
                                                    <FontAwesomeIcon icon="check" className="me-1" /> Accept
                                                </Button>
                                                <Button size="sm" variant="outline-secondary" className="text-muted">
                                                    <FontAwesomeIcon icon="times" className="me-1" /> Decline
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Quick Actions & Profile */}
                <Col lg={4} className="mb-4">
                    {/* Quick Actions */}
                    <Card className="medical-card mb-4">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <div className="row g-3">
                                <div className="col-6"><QuickActionTile icon="clock" label="Clock In/Out" accent="gradient-primary" /></div>
                                <div className="col-6"><QuickActionTile icon="file-invoice" label="Timesheet" accent="gradient-success" /></div>
                                <div className="col-6"><QuickActionTile icon="calendar-plus" label="Availability" accent="gradient-info" /></div>
                                <div className="col-6"><QuickActionTile icon="star" label="Rate Client" accent="gradient-warning" /></div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Profile Summary */}
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="id-badge" className="me-2" />
                            Profile Summary
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center mb-3">
                                <FontAwesomeIcon icon="user-circle" size="3x" className="text-primary mb-2" />
                                <h6>{user.name}</h6>
                                <Badge bg="success">Verified Caregiver</Badge>
                            </div>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Rating:</span>
                                    <span>
                                        <FontAwesomeIcon icon="star" className="text-warning me-1" />
                                        4.9/5.0
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Completed Jobs:</span>
                                    <span>247</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Years Experience:</span>
                                    <span>5+</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Specialization:</span>
                                    <span>Elder Care</span>
                                </ListGroup.Item>
                            </ListGroup>
                            <Button className="gradient-primary w-100 mt-3">
                                <FontAwesomeIcon icon="edit" className="me-2" /> Edit Profile
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CaregiverDashboard;