import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, ListGroup, Modal, Form } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Patient list removed; caregivers should only see clients they serve
import { listAppointments } from '../../services/appointmentService';
import { listCareRequests } from '../../services/caregiverService';

const CaregiverDashboard = () => {
    const { user } = useAuth();

    // Greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Get user's full name (like DoctorDashboard)
    const getUserFullName = () => {
        if (user && user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user && user.name) {
            return user.name;
        }
        return '';
    };
    // Removed global patient list fetching logic

    // Service requests fetched from backend
    const [serviceRequests, setServiceRequests] = useState([]);
    const [serviceRequestsLoading, setServiceRequestsLoading] = useState(true);
    const [serviceRequestsError, setServiceRequestsError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchRequests = async () => {
            setServiceRequestsLoading(true);
            setServiceRequestsError(null);
            try {
                const reqs = await listCareRequests({ status: 'new' });
                if (mounted) setServiceRequests(Array.isArray(reqs) ? reqs : []);
            } catch (e) {
                if (mounted) setServiceRequestsError(e.message || 'Failed to load service requests');
            } finally {
                if (mounted) setServiceRequestsLoading(false);
            }
        };
        fetchRequests();
        return () => { mounted = false; };
    }, []);

    // Placeholder for future backend messages integration
    const [recentMessages] = useState([]);
    const [messagesLoading] = useState(false);
    const [messagesError] = useState(null);
    // TODO: Integrate with backend messages API when available

    // Today's schedule fetched from backend
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchSchedule = async () => {
            setScheduleLoading(true);
            setScheduleError(null);
            try {
                // Format today's date as YYYY-MM-DD for backend filtering
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                const appts = await listAppointments({ date: dateStr });
                const normalized = (Array.isArray(appts) ? appts : []).map(a => ({
                    id: a.id,
                    // Prefer explicit time fields; fallback to building from date
                    time: a.time || a.start_time || a.startTime || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'),
                    client: a.patientName || (a.patient ? `${a.patient.first_name || ''} ${a.patient.last_name || ''}`.trim() : a.patient?.email) || '—',
                    service: a.type || a.service || '—',
                    location: a.location || a.place || '—',
                    status: (a.status || 'scheduled').toLowerCase()
                }));
                if (mounted) setTodaySchedule(normalized);
            } catch (e) {
                if (mounted) setScheduleError(e.message || 'Failed to load today\'s schedule');
            } finally {
                if (mounted) setScheduleLoading(false);
            }
        };
        fetchSchedule();
        return () => { mounted = false; };
    }, [user]);

    const getStatusBadge = (status) => {
        const map = {
            completed: { label: 'Completed', className: 'soft-badge bg-success-subtle text-success-emphasis' },
            'in-progress': { label: 'In Progress', className: 'soft-badge bg-warning-subtle text-warning-emphasis' },
            scheduled: { label: 'Scheduled', className: 'soft-badge bg-primary-subtle text-primary-emphasis' }
        };
        const meta = map[status] || { label: status, className: 'soft-badge bg-secondary-subtle text-secondary-emphasis' };
        return <span className={`badge rounded-pill ${meta.className}`}>{meta.label}</span>;
    };

    // Quick Actions interactivity
    const navigate = useNavigate();
    const [clockedIn, setClockedIn] = useState(false);
    const handleToggleClock = () => {
        setClockedIn(v => !v);
    };

    // Availability modal
    const [showAvailability, setShowAvailability] = useState(false);
    const [availability, setAvailability] = useState({
        days: [],
        notes: ''
    });
    const handleOpenAvailability = () => setShowAvailability(true);
    const handleCloseAvailability = () => setShowAvailability(false);
    const handleSaveAvailability = () => {
        // TODO: integrate with backend endpoint to save caregiver availability
        setShowAvailability(false);
    };

    // Rate Client modal
    const [showRateClient, setShowRateClient] = useState(false);
    const [ratingData, setRatingData] = useState({
        client: '',
        rating: 5,
        comments: ''
    });
    const handleOpenRateClient = (clientName) => {
        if (clientName) {
            setRatingData(prev => ({ ...prev, client: clientName }));
        }
        setShowRateClient(true);
    };
    const handleCloseRateClient = () => setShowRateClient(false);
    const handleSubmitRating = () => {
        // TODO: integrate with backend endpoint to submit client rating
        setShowRateClient(false);
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-nurse" className="me-3" />
                            {getGreeting()}, {getUserFullName()}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Making a difference in people's lives</p>
                    </Col>
                </Row>
            </div>

            {/* Today's Schedule and Recent Messages */}
            <Row>
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark">
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
                            {scheduleLoading && (
                                <div className="text-center py-4">Loading today\'s schedule...</div>
                            )}
                            {scheduleError && (
                                <div className="text-danger py-2">{scheduleError}</div>
                            )}
                            {!scheduleLoading && !scheduleError && (
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
                                        {todaySchedule.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted py-4">No appointments scheduled for today.</td>
                                            </tr>
                                        ) : (
                                            todaySchedule.map((appointment) => (
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
                                                                className="icon-btn gradient-success me-2"
                                                                aria-label={`Call ${appointment.client}`}
                                                            >
                                                                <FontAwesomeIcon icon="phone" />
                                                            </button>
                                                            <button
                                                                className="icon-btn me-2"
                                                                aria-label={clockedIn ? 'Clock out' : 'Clock in'}
                                                                onClick={handleToggleClock}
                                                            >
                                                                <FontAwesomeIcon icon="clock" />
                                                            </button>
                                                            <button
                                                                className="icon-btn"
                                                                aria-label={`Rate ${appointment.client}`}
                                                                onClick={() => handleOpenRateClient(appointment.client)}
                                                            >
                                                                <FontAwesomeIcon icon="star" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Messages */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header className="fw-bold text-dark">
                            <FontAwesomeIcon icon="comments" className="me-2" />
                            Recent Messages
                        </Card.Header>
                        <Card.Body>
                            {messagesLoading && <div className="text-center py-4">Loading messages...</div>}
                            {messagesError && <div className="text-danger py-2">{messagesError}</div>}
                            {!messagesLoading && !messagesError && recentMessages.length === 0 && (
                                <div className="text-center py-4 text-muted">No messages found.</div>
                            )}
                            {!messagesLoading && !messagesError && recentMessages.map((message) => (
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
                        <Card.Header className="fw-bold text-dark">
                            <FontAwesomeIcon icon="clipboard-list" className="me-2" />
                            New Service Requests
                        </Card.Header>
                        <Card.Body>
                            {serviceRequestsLoading && <div className="text-center py-4">Loading service requests...</div>}
                            {serviceRequestsError && <div className="text-danger py-2">{serviceRequestsError}</div>}
                            {!serviceRequestsLoading && !serviceRequestsError && serviceRequests.length === 0 && (
                                <div className="text-center py-4 text-muted">No new service requests.</div>
                            )}
                            {!serviceRequestsLoading && !serviceRequestsError && serviceRequests.map((request) => (
                                <Card key={request.id} className="mb-3 service-request-tile">
                                    <Card.Body>
                                        <Row className="align-items-center g-3">
                                            <Col md={8}>
                                                <div className="d-flex align-items-center mb-2 flex-wrap">
                                                    <h6 className="mb-0 me-2">{request.family || request.client || 'Client'}</h6>
                                                    {request.urgent && (
                                                        <Badge bg="danger" className="soft-badge">Urgent</Badge>
                                                    )}
                                                </div>
                                                <div className="small text-muted mb-1">{(request.services && request.services.join(', ')) || request.service || 'Service'} • {request.duration || 'Duration'}</div>
                                                <div className="fw-medium">Rate: {request.hourlyRate ? `$${request.hourlyRate}/hour` : request.rate ? request.rate : '—'}</div>
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
                        <Card.Header className="fw-bold text-dark">
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <div className="row g-3">
                                <div className="col-6">
                                    <QuickActionTile
                                        icon="file-invoice"
                                        label="Timesheet"
                                        accent="blue-theme"
                                        onClick={() => navigate('/caregiver/timesheet')}
                                    />
                                </div>
                                <div className="col-6">
                                    <QuickActionTile
                                        icon="calendar-plus"
                                        label="Availability"
                                        accent="blue-theme"
                                        onClick={handleOpenAvailability}
                                    />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Availability Modal */}
                    <Modal show={showAvailability} onHide={handleCloseAvailability} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Set Availability</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Available Days</Form.Label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <Form.Check
                                                key={day}
                                                type="checkbox"
                                                label={day}
                                                checked={availability.days.includes(day)}
                                                onChange={e => {
                                                    setAvailability(prev => {
                                                        const days = new Set(prev.days);
                                                        if (e.target.checked) days.add(day); else days.delete(day);
                                                        return { ...prev, days: Array.from(days) };
                                                    });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Notes</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={availability.notes}
                                        onChange={e => setAvailability(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Add any availability details..."
                                    />
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseAvailability}>Cancel</Button>
                            <Button className="gradient-primary" onClick={handleSaveAvailability}>Save</Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Rate Client Modal */}
                    <Modal show={showRateClient} onHide={handleCloseRateClient} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Rate Client</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Client Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={ratingData.client}
                                        onChange={e => setRatingData(prev => ({ ...prev, client: e.target.value }))}
                                        placeholder="Enter client name"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Rating</Form.Label>
                                    <Form.Range
                                        min={1}
                                        max={5}
                                        value={ratingData.rating}
                                        onChange={e => setRatingData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                    />
                                    <div>Selected: {ratingData.rating} / 5</div>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Comments</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={ratingData.comments}
                                        onChange={e => setRatingData(prev => ({ ...prev, comments: e.target.value }))}
                                        placeholder="Optional feedback"
                                    />
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseRateClient}>Cancel</Button>
                            <Button className="gradient-primary" onClick={handleSubmitRating}>Submit</Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Profile Summary */}
                    <Card className="medical-card">
                        <Card.Header className="fw-bold text-dark">
                            <FontAwesomeIcon icon="id-badge" className="me-2" />
                            Profile Summary
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center mb-3">
                                <FontAwesomeIcon icon="user-circle" size="3x" className="text-primary mb-2" />
                                <h6>{getUserFullName()}</h6>
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