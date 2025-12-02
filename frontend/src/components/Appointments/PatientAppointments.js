/**
 * Patient Appointments Component.
 * Allows patients to view, book, reschedule, and cancel appointments.
 * Includes a calendar view and list view of appointments.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { listAppointments, cancelAppointmentAction, joinVideoConsultation, listDoctors } from '../../services/appointmentService';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../styles/PatientAppointments.css';
import { useAuth } from '../../context/AuthContext';

const PatientAppointments = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ count: 0, next: null, previous: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming', 'past', 'all'

    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [modalType, setModalType] = useState('book'); // 'book', 'reschedule', 'cancel'
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date(),
        time: '',
        doctor: '',
        type: 'consultation',
        reason: ''
    });

    // We now use a native time picker (type="time") instead of a fixed list.

    const [doctors, setDoctors] = useState([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [doctorsError, setDoctorsError] = useState(null);
    // Fetch doctors from backend
    useEffect(() => {
        const fetchDoctors = async () => {
            setDoctorsLoading(true);
            setDoctorsError(null);
            try {
                const docs = await listDoctors();
                setDoctors(docs);
            } catch (e) {
                setDoctorsError('Failed to load doctors');
            } finally {
                setDoctorsLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'scheduled':
                return <Badge bg="info">Scheduled</Badge>;
            case 'completed':
                return <Badge bg="success">Completed</Badge>;
            case 'cancelled':
                return <Badge bg="danger">Cancelled</Badge>;
            case 'rescheduled':
                return <Badge bg="warning">Rescheduled</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const getAppointmentTypeIcon = (type) => {
        switch (type) {
            case 'consultation': return 'stethoscope';
            case 'follow-up': return 'redo';
            case 'check-up': return 'heartbeat';
            case 'urgent': return 'exclamation-circle';
            default: return 'calendar';
        }
    };

    const handleBookAppointment = () => {
        setModalType('book');
        setFormData({
            date: selectedDate,
            time: '',
            doctor: '',
            type: 'consultation',
            reason: ''
        });
        setShowModal(true);
    };

    const handleReschedule = (appointment) => {
        setModalType('reschedule');
        setSelectedAppointment(appointment);
        setFormData({
            date: appointment.date,
            // Normalize backend time like "HH:MM[:SS]" to "HH:MM" for the time input
            time: (appointment.time || '').toString().slice(0, 5),
            doctor: appointment.doctor_id || appointment.doctor?.id || '',
            type: appointment.type,
            reason: appointment.reason || ''
        });
        setShowModal(true);
    };

    const handleCancel = (appointment) => {
        setModalType('cancel');
        setSelectedAppointment(appointment);
        setShowModal(true);
    };

    const handleJoinVideo = async (appointment) => {
        try {
            const res = await joinVideoConsultation(appointment.id);
            if (res && res.video_link) {
                window.open(res.video_link, '_blank');
            } else {
                alert('No video link available for this appointment.');
            }
        } catch (e) {
            alert('Failed to join video consultation.');
        }
    };

    // Build a combined Date object from separate date (Date) and time ("HH:MM[:SS]")
    const getAppointmentDateTime = (apt) => {
        try {
            const d = new Date(apt.date);
            const [hh = '00', mm = '00'] = (apt.time || '').toString().split(':');
            const dt = new Date(d);
            dt.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
            return dt;
        } catch {
            return new Date(apt.date);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (modalType === 'cancel') {
            try {
                await cancelAppointmentAction(selectedAppointment.id);
                fetchData();
            } catch (e) {
                alert('Failed to cancel appointment.');
            }
            setShowModal(false);
            return;
        }
        // Book or reschedule appointment using backend
        try {
            const doctorId = formData.doctor ? Number(formData.doctor) : null;
            // TimeField expects 24h format "HH:MM" or "HH:MM:SS"; ensure HH:MM
            const time24 = (formData.time || '').slice(0, 5);
            const appointmentData = {
                date: formData.date.toISOString().split('T')[0],
                time: time24,
                doctorId,
                patientId: user?.id, // required by backend serializer
                type: formData.type,
                notes: formData.reason
            };
            if (modalType === 'book') {
                await import('../../services/appointmentService').then(({ createAppointment }) =>
                    createAppointment(appointmentData)
                );
            } else if (modalType === 'reschedule' && selectedAppointment) {
                // For reschedule, only send fields that may change; ensure snake_case handled by service
                await import('../../services/appointmentService').then(({ updateAppointment }) =>
                    updateAppointment(selectedAppointment.id, {
                        date: appointmentData.date,
                        time: appointmentData.time,
                        doctorId: appointmentData.doctorId || undefined,
                        type: appointmentData.type,
                        notes: appointmentData.notes
                    })
                );
            }
            fetchData();
        } catch (e) {
            alert('Failed to save appointment.');
        }
        setShowModal(false);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { items, meta } = await listAppointments({ page });
            const normalized = items.map(a => ({
                ...a,
                date: new Date(a.date),
                time: a.time,
                doctor: a.doctor?.first_name || a.doctor?.email || a.doctor || 'Doctor',
                specialization: a.type || 'General'
            }));
            setAppointments(normalized);
            setMeta(meta);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filterAppointments = () => {
        const now = new Date();
        if (viewMode === 'upcoming') {
            return appointments.filter(a => {
                const dt = getAppointmentDateTime(a);
                return dt >= now && a.status !== 'cancelled';
            });
        } else if (viewMode === 'past') {
            return appointments.filter(a => {
                const dt = getAppointmentDateTime(a);
                return dt < now || a.status === 'completed' || a.status === 'cancelled';
            });
        }
        return appointments;
    };

    const filteredAppointments = filterAppointments();

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dayAppointments = appointments.filter(apt =>
                apt.date.toDateString() === date.toDateString() && apt.status === 'scheduled'
            );
            if (dayAppointments.length > 0) {
                return (
                    <div className="calendar-appointments">
                        <small className="text-primary">●</small>
                    </div>
                );
            }
        }
    };

    const formatDate = (date) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }
    };

    // Helper: format time from "HH:MM[:SS]" to user-friendly e.g., "10:30 AM"
    const formatTime = (t) => {
        if (!t) return '';
        const [hh, mm] = t.toString().split(':');
        const h = parseInt(hh, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = ((h + 11) % 12) + 1;
        return `${hour12}:${mm} ${ampm}`;
    };

    // Generate 15-minute time slots between working hours; exclude past times for today
    const generateTimeSlots = (dateObj, start = '08:00', end = '17:45', step = 15) => {
        const slots = [];
        const [sh, sm] = start.split(':').map(n => parseInt(n, 10));
        const [eh, em] = end.split(':').map(n => parseInt(n, 10));
        const d = new Date(dateObj);
        const startDt = new Date(d);
        startDt.setHours(sh, sm, 0, 0);
        const endDt = new Date(d);
        endDt.setHours(eh, em, 0, 0);

        const now = new Date();
        for (let cur = new Date(startDt); cur <= endDt; cur = new Date(cur.getTime() + step * 60000)) {
            // Skip times in the past if selected date is today
            if (cur.toDateString() === now.toDateString() && cur <= now) continue;
            const hh = String(cur.getHours()).padStart(2, '0');
            const mm = String(cur.getMinutes()).padStart(2, '0');
            slots.push(`${hh}:${mm}`);
        }
        return slots;
    };

    return (
        <Container fluid className="fade-in">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h2>
                                <FontAwesomeIcon icon="calendar" className="me-2 text-primary" />
                                My Appointments
                            </h2>
                            <p className="text-muted mb-0">Manage and view all your appointments</p>
                        </div>
                        <Button variant="primary" size="lg" onClick={handleBookAppointment}>
                            <FontAwesomeIcon icon="plus" className="me-2" />
                            Book New Appointment
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* View Mode Tabs */}
            <Row className="mb-4">
                <Col>
                    <div className="btn-group w-100" role="group">
                        <Button
                            variant={viewMode === 'upcoming' ? 'primary' : 'outline-primary'}
                            onClick={() => setViewMode('upcoming')}
                        >
                            <FontAwesomeIcon icon="clock" className="me-2" />
                            Upcoming
                        </Button>
                        <Button
                            variant={viewMode === 'past' ? 'primary' : 'outline-primary'}
                            onClick={() => setViewMode('past')}
                        >
                            <FontAwesomeIcon icon="history" className="me-2" />
                            Past
                        </Button>
                        <Button
                            variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
                            onClick={() => setViewMode('all')}
                        >
                            <FontAwesomeIcon icon="list" className="me-2" />
                            All
                        </Button>
                    </div>
                </Col>
            </Row>

            <Row>
                {/* Calendar View */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="calendar-alt" className="me-2" />
                            Calendar
                        </Card.Header>
                        <Card.Body>
                            <Calendar
                                onChange={setSelectedDate}
                                value={selectedDate}
                                tileContent={tileContent}
                                className="w-100"
                            />
                            <div className="mt-3">
                                <small className="text-muted">
                                    <FontAwesomeIcon icon="circle" className="text-primary me-2" size="sm" />
                                    Days with appointments
                                </small>
                            </div>
                            <hr />
                            <div className="text-center">
                                <Button variant="outline-primary" size="sm" className="w-100" onClick={handleBookAppointment}>
                                    <FontAwesomeIcon icon="plus" className="me-2" />
                                    Quick Book
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Appointments List - Card View */}
                <Col lg={8} className="mb-4">
                    {error && (
                        <Alert variant="danger" className="d-flex align-items-center mb-3">
                            <FontAwesomeIcon icon="exclamation-circle" className="me-2" />
                            {error}
                        </Alert>
                    )}

                    {loading && (
                        <Card className="medical-card text-center py-5">
                            <Card.Body>
                                <FontAwesomeIcon icon="spinner" spin size="3x" className="text-primary mb-3" />
                                <p className="text-muted">Loading appointments...</p>
                            </Card.Body>
                        </Card>
                    )}

                    {!loading && filteredAppointments.length === 0 ? (
                        <Card className="medical-card text-center py-5">
                            <Card.Body>
                                <FontAwesomeIcon icon="calendar-times" size="3x" className="text-muted mb-3 opacity-50" />
                                <h5>No {viewMode} appointments</h5>
                                <p className="text-muted">You don't have any {viewMode} appointments scheduled.</p>
                                <Button variant="primary" onClick={handleBookAppointment}>
                                    <FontAwesomeIcon icon="plus" className="me-2" />
                                    Book Your First Appointment
                                </Button>
                            </Card.Body>
                        </Card>
                    ) : (
                        <>
                            {filteredAppointments.map((appointment) => (
                                <Card key={appointment.id} className="medical-card mb-3 appointment-card">
                                    <Card.Body>
                                        <Row className="align-items-center">
                                            {/* Date & Time */}
                                            <Col md={3} className="text-center border-end mb-3 mb-md-0">
                                                <div className="appointment-date">
                                                    <div className="date-month text-muted small">
                                                        {appointment.date.toLocaleDateString('en-US', { month: 'short' })}
                                                    </div>
                                                    <div className="date-day display-6 fw-bold text-primary">
                                                        {appointment.date.getDate()}
                                                    </div>
                                                    <div className="date-time text-muted">
                                                        <FontAwesomeIcon icon="clock" className="me-1" />
                                                        {formatTime(appointment.time)}
                                                    </div>
                                                    <div className="mt-2">
                                                        <Badge bg="light" text="dark" className="text-uppercase">
                                                            {formatDate(appointment.date)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Col>

                                            {/* Appointment Details */}
                                            <Col md={6} className="mb-3 mb-md-0">
                                                <div className="d-flex align-items-start mb-2">
                                                    <FontAwesomeIcon
                                                        icon={getAppointmentTypeIcon(appointment.type)}
                                                        className="text-primary mt-1 me-3"
                                                        size="lg"
                                                    />
                                                    <div className="flex-grow-1">
                                                        <h5 className="mb-1">{appointment.doctor}</h5>
                                                        <p className="text-muted small mb-2">
                                                            <FontAwesomeIcon icon="user-md" className="me-1" />
                                                            {appointment.specialization}
                                                        </p>
                                                        <div className="mb-2">
                                                            <Badge
                                                                bg="light"
                                                                text="dark"
                                                                className="me-2 text-capitalize"
                                                            >
                                                                <FontAwesomeIcon icon={getAppointmentTypeIcon(appointment.type)} className="me-1" />
                                                                {appointment.type}
                                                            </Badge>
                                                            {getStatusBadge(appointment.status)}
                                                        </div>
                                                        {appointment.notes && (
                                                            <p className="small text-muted mb-0">
                                                                <FontAwesomeIcon icon="sticky-note" className="me-1" />
                                                                {appointment.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Col>

                                            {/* Actions */}
                                            <Col md={3} className="text-center">
                                                <div className="d-grid gap-2">
                                                    {appointment.status === 'scheduled' && (
                                                        <>
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={<Tooltip>Join Video Call</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="success"
                                                                    size="sm"
                                                                    onClick={() => handleJoinVideo(appointment)}
                                                                    disabled={!appointment.video_link}
                                                                >
                                                                    <FontAwesomeIcon icon="video" className="me-2" />
                                                                    Join Call
                                                                </Button>
                                                            </OverlayTrigger>

                                                            <Button
                                                                variant="outline-warning"
                                                                size="sm"
                                                                onClick={() => handleReschedule(appointment)}
                                                            >
                                                                <FontAwesomeIcon icon="edit" className="me-2" />
                                                                Reschedule
                                                            </Button>

                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleCancel(appointment)}
                                                            >
                                                                <FontAwesomeIcon icon="times" className="me-2" />
                                                                Cancel
                                                            </Button>
                                                        </>
                                                    )}
                                                    {appointment.status === 'completed' && (
                                                        <Button size="sm" variant="outline-primary">
                                                            <FontAwesomeIcon icon="file-medical" className="me-2" />
                                                            View Details
                                                        </Button>
                                                    )}
                                                    {appointment.status === 'cancelled' && (
                                                        <Badge bg="danger" className="py-2">
                                                            <FontAwesomeIcon icon="ban" className="me-1" />
                                                            Cancelled
                                                        </Badge>
                                                    )}
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))}

                            {/* Pagination */}
                            {meta.count > 25 && (
                                <div className="d-flex justify-content-between align-items-center mt-4">
                                    <small className="text-muted">
                                        Showing {filteredAppointments.length} of {meta.count} appointments
                                    </small>
                                    <div>
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            className="me-2"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            <FontAwesomeIcon icon="chevron-left" className="me-1" />
                                            Previous
                                        </Button>
                                        <span className="me-2">Page {page}</span>
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            disabled={!meta.next}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            Next
                                            <FontAwesomeIcon icon="chevron-right" className="ms-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Col>
            </Row>

            {/* Appointment Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon
                            icon={
                                modalType === 'book' ? 'plus' :
                                    modalType === 'reschedule' ? 'edit' : 'times'
                            }
                            className="me-2 text-primary"
                        />
                        {modalType === 'book' && 'Book New Appointment'}
                        {modalType === 'reschedule' && 'Reschedule Appointment'}
                        {modalType === 'cancel' && 'Cancel Appointment'}
                    </Modal.Title>
                </Modal.Header>

                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {modalType === 'cancel' ? (
                            <Alert variant="warning">
                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                <strong>Are you sure?</strong>
                                <p className="mb-0 mt-2">
                                    You are about to cancel your appointment with <strong>{selectedAppointment?.doctor}</strong> on <strong>{selectedAppointment?.date.toLocaleDateString()}</strong> at <strong>{selectedAppointment?.time}</strong>.
                                </p>
                            </Alert>
                        ) : (
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <FontAwesomeIcon icon="calendar" className="me-2" />
                                            Date
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={formData.date.toISOString().split('T')[0]}
                                            onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <FontAwesomeIcon icon="clock" className="me-2" />
                                            Time
                                        </Form.Label>
                                        <Form.Select
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a time</option>
                                            {generateTimeSlots(formData.date).map(t => (
                                                <option key={t} value={t}>{formatTime(t)}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <FontAwesomeIcon icon="user-md" className="me-2" />
                                            Doctor
                                        </Form.Label>
                                        <Form.Select
                                            value={formData.doctor}
                                            onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                                            required
                                            disabled={doctorsLoading}
                                        >
                                            <option value="">{doctorsLoading ? 'Loading doctors...' : 'Select doctor'}</option>
                                            {doctors.map(doctor => (
                                                <option key={doctor.id} value={doctor.id}>
                                                    {doctor.first_name} {doctor.last_name} - {doctor.primary_condition || doctor.specialization || 'Specialist'}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        {doctorsError && <div className="text-danger small mt-1">{doctorsError}</div>}
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <FontAwesomeIcon icon="stethoscope" className="me-2" />
                                            Appointment Type
                                        </Form.Label>
                                        <Form.Select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            required
                                        >
                                            <option value="consultation">Consultation</option>
                                            <option value="follow-up">Follow-up</option>
                                            <option value="check-up">Check-up</option>
                                            <option value="urgent">Urgent Care</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <FontAwesomeIcon icon="comment-medical" className="me-2" />
                                            Reason for Visit
                                        </Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            placeholder="Please describe your symptoms or reason for the appointment"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant={modalType === 'cancel' ? 'danger' : 'primary'}
                        >
                            {modalType === 'book' && 'Book Appointment'}
                            {modalType === 'reschedule' && 'Reschedule'}
                            {modalType === 'cancel' && 'Confirm Cancellation'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default PatientAppointments;
