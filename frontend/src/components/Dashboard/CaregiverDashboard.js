import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Patient list removed; caregivers should only see clients they serve
import { listAppointments } from '../../services/appointmentService';
import { listCareRequests, acceptCareRequest, declineCareRequest, updateMyLocation } from '../../services/caregiverService';

const CaregiverDashboard = () => {
    const { user, refreshUserProfile, updateUser } = useAuth();

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

    // Auto-report caregiver location once on mount
    useEffect(() => {
        if (!user || user.role !== 'caregiver') return;
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                updateMyLocation(latitude, longitude);
            },
            (err) => {
                // silently ignore
                console.debug('Geolocation error:', err?.message || err);
            },
            { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
        );
    }, [user]);

    // Handler for accepting a care request
    const handleAcceptRequest = async (requestId) => {
        try {
            console.log('Attempting to accept request:', requestId);
            const result = await acceptCareRequest(requestId);
            console.log('Accept result:', result);

            if (result.success) {
                // Refresh the list to show updated status
                const reqs = await listCareRequests({ status: 'new' });
                setServiceRequests(Array.isArray(reqs) ? reqs : []);
                // Show success message
                alert('Request accepted successfully!');
            } else {
                alert(`Failed to accept request: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error in handleAcceptRequest:', error);
            alert(`Error accepting request: ${error.message}`);
        }
    };

    // Handler for declining a care request
    const handleDeclineRequest = async (requestId) => {
        try {
            console.log('Attempting to decline request:', requestId);
            const result = await declineCareRequest(requestId);
            console.log('Decline result:', result);

            if (result.success) {
                // Refresh the list to remove declined request
                const reqs = await listCareRequests({ status: 'new' });
                setServiceRequests(Array.isArray(reqs) ? reqs : []);
                // Show success message
                alert('Request declined successfully!');
            } else {
                alert(`Failed to decline request: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error in handleDeclineRequest:', error);
            alert(`Error declining request: ${error.message}`);
        }
    };


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

    // --- Profile summary: fetch latest profile once on mount ---
    useEffect(() => {
        if (!user) return;
        refreshUserProfile().catch(() => { /* ignore refresh errors */ });
    }, [user, refreshUserProfile]);

    // Edit profile modal
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState(null);
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [editForm, setEditForm] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || '',
        experience_years: typeof user?.experience_years === 'number' ? user.experience_years : (user?.experience_years || 0),
        specializations: Array.isArray(user?.specializations) ? user.specializations.join(', ') : '',
        hourly_rate: user?.hourly_rate != null ? user.hourly_rate : '',
        bio: user?.bio || ''
    });

    useEffect(() => {
        // keep form in sync with user when it changes
        setEditForm({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            phone: user?.phone || '',
            experience_years: typeof user?.experience_years === 'number' ? user.experience_years : (user?.experience_years || 0),
            specializations: Array.isArray(user?.specializations) ? user.specializations.join(', ') : '',
            hourly_rate: user?.hourly_rate != null ? user.hourly_rate : '',
            bio: user?.bio || ''
        });
    }, [user?.first_name, user?.last_name, user?.phone, user?.experience_years, user?.specializations, user?.hourly_rate, user?.bio]);

    const handleCloseEdit = () => { setShowEditProfile(false); setEditError(null); };
    const handleSaveEdit = async () => {
        try {
            setEditSaving(true);
            setEditError(null);
            setEditFieldErrors({});
            const payload = {
                first_name: editForm.first_name?.trim() || '',
                last_name: editForm.last_name?.trim() || '',
                phone: editForm.phone?.trim() || '',
                experience_years: Number(editForm.experience_years) || 0,
                specializations: editForm.specializations
                    ? editForm.specializations.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                hourly_rate: editForm.hourly_rate === '' ? 0 : Number(editForm.hourly_rate),
                bio: editForm.bio?.toString() || ''
            };
            const res = await updateUser(payload);
            if (!res?.success) {
                if (res.fieldErrors) {
                    setEditFieldErrors(res.fieldErrors);
                }
                throw new Error(res?.error || 'Update failed');
            }
            await refreshUserProfile();
            setShowEditProfile(false);
        } catch (e) {
            setEditError(e?.message || 'Failed to save');
        } finally {
            setEditSaving(false);
        }
    };

    const getFieldError = (field) => {
        const val = editFieldErrors && editFieldErrors[field];
        if (!val) return '';
        if (Array.isArray(val)) return val.join(' ');
        if (typeof val === 'string') return val;
        try { return JSON.stringify(val); } catch { return String(val); }
    };

    const formatKsh = (value) => {
        const n = Number(value);
        if (Number.isNaN(n)) return 'Ksh —';
        return `Ksh ${new Intl.NumberFormat('en-KE').format(Math.round(n))}`;
    };

    // Verification document upload
    // Verification document upload handlers removed (not used in UI)

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
            <Row className="equal-cols">
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card h-100">
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

                {/* Recent Activities */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header className="fw-bold text-dark">
                            <FontAwesomeIcon icon="history" className="me-2" />
                            Recent Activities
                        </Card.Header>
                        <Card.Body>
                            {messagesLoading && <div className="text-center py-4">Loading activity...</div>}
                            {messagesError && <div className="text-danger py-2">{messagesError}</div>}
                            {!messagesLoading && !messagesError && recentMessages.length === 0 && (
                                <div className="text-center py-4 text-muted">No recent activity.</div>
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
                                View all activity
                                <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Service Requests and Quick Actions/Profile */}
            <Row className="equal-cols">
                {/* Service Requests */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card h-100">
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
                                                <div className="fw-medium">
                                                    Rate: {(() => {
                                                        if (request.hourlyRate != null && request.hourlyRate !== '') {
                                                            return `${formatKsh(request.hourlyRate)}/hour`;
                                                        }
                                                        if (request.rate != null && request.rate !== '') {
                                                            // attempt to format numeric string; fallback to raw
                                                            const num = Number(request.rate);
                                                            return Number.isFinite(num) ? formatKsh(num) : (request.rate || '—');
                                                        }
                                                        return '—';
                                                    })()}
                                                </div>
                                            </Col>
                                            <Col md={4} className="text-end">
                                                <Button
                                                    size="sm"
                                                    className="gradient-success me-2"
                                                    onClick={() => handleAcceptRequest(request.id)}
                                                    disabled={!request.canAccept}
                                                >
                                                    <FontAwesomeIcon icon="check" className="me-1" /> Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    className="text-muted"
                                                    onClick={() => handleDeclineRequest(request.id)}
                                                    disabled={!request.canDecline}
                                                >
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
                    <Card className="medical-card mb-4 h-100">
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
                                {/* Follow-ups tile removed */}
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



                    {/* Edit Profile Modal */}
                    <Modal show={showEditProfile} onHide={handleCloseEdit} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Edit Profile</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {editError && <div className="text-danger small mb-2">{editError}</div>}
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                                        isInvalid={!!getFieldError('first_name')}
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('first_name')}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                                        isInvalid={!!getFieldError('last_name')}
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('last_name')}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                        isInvalid={!!getFieldError('phone')}
                                        placeholder="e.g., +2547..."
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('phone')}</Form.Control.Feedback>
                                </Form.Group>
                                <hr />
                                <Form.Group className="mb-3 mt-2">
                                    <Form.Label>Experience (years)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={editForm.experience_years}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, experience_years: e.target.value }))}
                                        isInvalid={!!getFieldError('experience_years')}
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('experience_years')}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Specializations</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editForm.specializations}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, specializations: e.target.value }))}
                                        isInvalid={!!getFieldError('specializations')}
                                        placeholder="e.g., Elder Care, Post-Surgery Care"
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('specializations')}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Hourly Rate (Ksh)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={editForm.hourly_rate}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                                        isInvalid={!!getFieldError('hourly_rate')}
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('hourly_rate')}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Bio</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                        isInvalid={!!getFieldError('bio')}
                                        placeholder="Short professional bio..."
                                    />
                                    <Form.Control.Feedback type="invalid">{getFieldError('bio')}</Form.Control.Feedback>
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseEdit} disabled={editSaving}>Cancel</Button>
                            <Button className="gradient-primary" onClick={handleSaveEdit} disabled={editSaving}>
                                {editSaving ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
};

export default CaregiverDashboard;