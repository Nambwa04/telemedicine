import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Patient list removed; caregivers should only see clients they serve
import { listAppointments } from '../../services/appointmentService';
import { listCareRequests, acceptCareRequest, declineCareRequest, updateMyLocation } from '../../services/caregiverService';
import { getMySchedule, bulkCreateWeeklySlots } from '../../services/availabilityService';
import { getUnreadCareNotes } from '../../services/careNotesService';

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
    // Report location only once per session to avoid update loops
    const locationReportedRef = useRef(false);
    useEffect(() => {
        if (!user || user.role !== 'caregiver') return;
        if (locationReportedRef.current) return;
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                locationReportedRef.current = true;
                updateMyLocation(latitude, longitude);
            },
            (err) => {
                // silently ignore
                console.debug('Geolocation error:', err?.message || err);
                locationReportedRef.current = true; // prevent repeated prompts
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


    // Recent Activity: synthesize from care requests and today's appointments
    const [recentMessages, setRecentMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState(null);

    // Unread care notes state
    const [unreadNotes, setUnreadNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function loadRecent() {
            if (!user || user.role !== 'caregiver') return;
            setMessagesLoading(true);
            setMessagesError(null);
            try {
                // Build today (YYYY-MM-DD)
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                // Fetch data in parallel
                const [reqs, apptsResp] = await Promise.all([
                    listCareRequests(),
                    listAppointments({ date: dateStr })
                ]);

                const appts = Array.isArray(apptsResp?.items) ? apptsResp.items : (Array.isArray(apptsResp) ? apptsResp : []);

                // Map care requests to activity items
                const requestActivities = (Array.isArray(reqs) ? reqs : []).slice(0, 50).map(r => ({
                    id: `req-${r.id}`,
                    type: 'request',
                    time: r.requestedDate || (r.created_at ? new Date(r.created_at) : new Date()),
                    message: (() => {
                        const who = r.family || r.patientEmail || 'Client';
                        switch ((r.status || 'new')) {
                            case 'accepted': return `Accepted service request for ${who}`;
                            case 'in-progress': return `Started care for ${who}`;
                            case 'completed': return `Completed care for ${who}`;
                            case 'declined': return `Declined service request for ${who}`;
                            default: return `New service request from ${who}`;
                        }
                    })()
                }));

                // Map today's appointments to activity items
                const appointmentActivities = appts.map(a => ({
                    id: `appt-${a.id}`,
                    type: 'appointment',
                    time: a.date ? new Date(a.date) : new Date(),
                    message: `Appointment with ${a.patientName || 'patient'} at ${a.time || '—'}`
                }));

                // Combine and sort by time desc, limit to latest 10
                const combined = [...requestActivities, ...appointmentActivities]
                    .filter(Boolean)
                    .sort((a, b) => (new Date(b.time)) - (new Date(a.time)))
                    .slice(0, 10);

                if (mounted) setRecentMessages(combined);
            } catch (e) {
                if (mounted) setMessagesError(e.message || 'Failed to load recent activity');
            } finally {
                if (mounted) setMessagesLoading(false);
            }
        }
        loadRecent();
        return () => { mounted = false; };
    }, [user]);

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

                const apptsResp = await listAppointments({ date: dateStr });
                const appts = Array.isArray(apptsResp?.items) ? apptsResp.items : (Array.isArray(apptsResp) ? apptsResp : []);
                const normalized = appts.map(a => ({
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

    // Fetch unread care notes
    useEffect(() => {
        let mounted = true;
        const fetchUnreadNotes = async () => {
            setNotesLoading(true);
            try {
                const notes = await getUnreadCareNotes();
                if (mounted) setUnreadNotes(notes.slice(0, 5)); // Show only 5 most recent
            } catch (err) {
                console.error('Failed to fetch unread notes:', err);
            } finally {
                if (mounted) setNotesLoading(false);
            }
        };
        fetchUnreadNotes();
        return () => { mounted = false; };
    }, []);

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

    // Availability modal - each day can have different times
    const [showAvailability, setShowAvailability] = useState(false);
    const [availabilityByDay, setAvailabilityByDay] = useState({
        monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
    });
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);
    
    const handleOpenAvailability = async () => {
        setShowAvailability(true);
        setLoadingSlots(true);
        try {
            const slots = await getMySchedule();
            // Populate availabilityByDay from existing slots
            const dayData = {
                monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
            };
            slots.forEach(slot => {
                if (dayData[slot.dayOfWeek]) {
                    dayData[slot.dayOfWeek] = {
                        enabled: slot.isAvailable,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        slotId: slot.id
                    };
                }
            });
            setAvailabilityByDay(dayData);
        } catch (err) {
            console.error('Failed to load availability:', err);
        } finally {
            setLoadingSlots(false);
        }
    };
    
    const handleCloseAvailability = () => {
        setShowAvailability(false);
    };
    
    const handleSaveAvailability = async () => {
        setSavingAvailability(true);
        try {
            // Create new slots for each enabled day
            for (const [day, config] of Object.entries(availabilityByDay)) {
                if (config.enabled && config.startTime && config.endTime) {
                    await bulkCreateWeeklySlots({
                        days: [day],
                        startTime: config.startTime,
                        endTime: config.endTime,
                        notes: ''
                    });
                }
            }
            
            alert('Availability saved successfully!');
            setShowAvailability(false);
        } catch (err) {
            alert('Failed to save availability: ' + (err.message || 'Unknown error'));
        } finally {
            setSavingAvailability(false);
        }
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
    // Refresh profile only once when user becomes available to avoid infinite update loops
    const didRefreshProfileRef = useRef(false);
    useEffect(() => {
        if (!user) return;
        if (didRefreshProfileRef.current) return;
        didRefreshProfileRef.current = true;
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

    // Helper: format timestamps safely for display
    const formatActivityTime = (t) => {
        if (!t) return '—';
        try {
            const d = t instanceof Date ? t : new Date(t);
            if (Number.isNaN(d.getTime())) return String(t);
            return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return String(t);
        }
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
            <Row className="equal-cols">
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark">
                            <span>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Today's Schedule
                            </span>
                        </Card.Header>
                        <Card.Body>
                            {scheduleLoading && (
                                <div className="text-center py-4">Loading today 's schedule...</div>
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
                                        <small className="text-muted">{formatActivityTime(message.time)}</small>
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

            {/* Care Notes Section */}
            <Row>
                <Col lg={12} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark">
                            <span>
                                <FontAwesomeIcon icon="notes-medical" className="me-2" />
                                Recent Care Notes
                            </span>
                            <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => navigate('/health-dashboard')}
                            >
                                View All Notes
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {notesLoading ? (
                                <div className="text-center py-4">Loading notes...</div>
                            ) : unreadNotes.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <FontAwesomeIcon icon="notes-medical" size="2x" className="mb-2 opacity-50" />
                                    <p className="mb-0">No unread care notes</p>
                                </div>
                            ) : (
                                <>
                                    {unreadNotes.map((note) => (
                                        <Card key={note.id} className="mb-3 border-start border-primary border-3">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <Badge bg="primary" className="me-2">{note.note_type}</Badge>
                                                        <Badge bg={note.priority === 'urgent' ? 'danger' : note.priority === 'high' ? 'warning' : 'secondary'}>
                                                            {note.priority}
                                                        </Badge>
                                                        {note.is_pinned && <Badge bg="warning" className="ms-2">📌 Pinned</Badge>}
                                                    </div>
                                                    <small className="text-muted">
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </small>
                                                </div>
                                                <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                                                </p>
                                                <small className="text-muted">
                                                    By {note.author_name} • For patient ID: {note.patient}
                                                </small>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                    <Button
                                        variant="link"
                                        className="p-0 text-primary"
                                        onClick={() => navigate('/health-dashboard')}
                                    >
                                        View all notes <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                                    </Button>
                                </>
                            )}
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
                </Col>
            </Row>

            {/* Care Notes Section */}
            <Row>
                <Col lg={12} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark">
                            <span>
                                <FontAwesomeIcon icon="notes-medical" className="me-2" />
                                Recent Care Notes
                            </span>
                            <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => navigate('/health-dashboard')}
                            >
                                View All Notes
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {notesLoading ? (
                                <div className="text-center py-4">Loading notes...</div>
                            ) : unreadNotes.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <FontAwesomeIcon icon="notes-medical" size="2x" className="mb-2 opacity-50" />
                                    <p className="mb-0">No unread care notes</p>
                                </div>
                            ) : (
                                <>
                                    {unreadNotes.map((note) => (
                                        <Card key={note.id} className="mb-3 border-start border-primary border-3">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <Badge bg="primary" className="me-2">{note.note_type}</Badge>
                                                        <Badge bg={note.priority === 'urgent' ? 'danger' : note.priority === 'high' ? 'warning' : 'secondary'}>
                                                            {note.priority}
                                                        </Badge>
                                                        {note.is_pinned && <Badge bg="warning" className="ms-2">📌 Pinned</Badge>}
                                                    </div>
                                                    <small className="text-muted">
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </small>
                                                </div>
                                                <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                                                </p>
                                                <small className="text-muted">
                                                    By {note.author_name} • For patient ID: {note.patient}
                                                </small>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                    <Button
                                        variant="link"
                                        className="p-0 text-primary"
                                        onClick={() => navigate('/health-dashboard')}
                                    >
                                        View all notes <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                                    </Button>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modals */}
            <Row>
                <Col>
                    {/* Availability Modal */}
                    <Modal show={showAvailability} onHide={handleCloseAvailability} centered size="lg">
                        <Modal.Header closeButton>
                            <Modal.Title>Manage Weekly Availability</Modal.Title>
                        </Modal.Header>
                        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {loadingSlots ? (
                                <div className="text-center py-3">Loading availability...</div>
                            ) : (
                                <>
                                    <p className="text-muted small mb-3">
                                        Set your available hours for each day. You can set different times for each day.
                                    </p>
                                    
                                    <Form>
                                        {[
                                            { value: 'monday', label: 'Monday' },
                                            { value: 'tuesday', label: 'Tuesday' },
                                            { value: 'wednesday', label: 'Wednesday' },
                                            { value: 'thursday', label: 'Thursday' },
                                            { value: 'friday', label: 'Friday' },
                                            { value: 'saturday', label: 'Saturday' },
                                            { value: 'sunday', label: 'Sunday' }
                                        ].map(day => (
                                            <Card key={day.value} className="mb-3 border">
                                                <Card.Body className="py-2">
                                                    <Row className="align-items-center">
                                                        <Col xs={12} md={3}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                id={`day-${day.value}`}
                                                                label={<strong>{day.label}</strong>}
                                                                checked={availabilityByDay[day.value]?.enabled || false}
                                                                onChange={e => {
                                                                    setAvailabilityByDay(prev => ({
                                                                        ...prev,
                                                                        [day.value]: {
                                                                            ...prev[day.value],
                                                                            enabled: e.target.checked
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                        </Col>
                                                        <Col xs={6} md={4}>
                                                            <Form.Group className="mb-0">
                                                                <Form.Label className="small mb-1">Start Time</Form.Label>
                                                                <Form.Control
                                                                    type="time"
                                                                    size="sm"
                                                                    value={availabilityByDay[day.value]?.startTime || '09:00'}
                                                                    disabled={!availabilityByDay[day.value]?.enabled}
                                                                    onChange={e => {
                                                                        setAvailabilityByDay(prev => ({
                                                                            ...prev,
                                                                            [day.value]: {
                                                                                ...prev[day.value],
                                                                                startTime: e.target.value
                                                                            }
                                                                        }));
                                                                    }}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs={6} md={4}>
                                                            <Form.Group className="mb-0">
                                                                <Form.Label className="small mb-1">End Time</Form.Label>
                                                                <Form.Control
                                                                    type="time"
                                                                    size="sm"
                                                                    value={availabilityByDay[day.value]?.endTime || '17:00'}
                                                                    disabled={!availabilityByDay[day.value]?.enabled}
                                                                    onChange={e => {
                                                                        setAvailabilityByDay(prev => ({
                                                                            ...prev,
                                                                            [day.value]: {
                                                                                ...prev[day.value],
                                                                                endTime: e.target.value
                                                                            }
                                                                        }));
                                                                    }}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        {availabilityByDay[day.value]?.enabled && (
                                                            <Col xs={12} md={1} className="text-center">
                                                                <Badge bg="success" className="mt-2 mt-md-0">
                                                                    <FontAwesomeIcon icon="check" />
                                                                </Badge>
                                                            </Col>
                                                        )}
                                                    </Row>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </Form>
                                </>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseAvailability} disabled={savingAvailability}>
                                Cancel
                            </Button>
                            <Button 
                                className="gradient-primary" 
                                onClick={handleSaveAvailability}
                                disabled={savingAvailability || loadingSlots}
                            >
                                {savingAvailability ? 'Saving...' : 'Save Availability'}
                            </Button>
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