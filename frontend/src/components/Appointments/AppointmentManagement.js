import React, { useState, useEffect } from 'react';
import { listAppointments, cancelAppointmentAction, joinVideoConsultation } from '../../services/appointmentService';
import { Container, Row, Col, Card, Button, Modal, Form, Table, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const AppointmentManagement = ({ userRole = 'patient' }) => {
    const [appointments, setAppointments] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ count: 0, next: null, previous: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const [availableTimes] = useState([
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
    ]);

    const [doctors] = useState([
        { id: 1, name: 'Dr. Sarah Johnson', specialization: 'Cardiology' },
        { id: 2, name: 'Dr. Michael Brown', specialization: 'General Medicine' },
        { id: 3, name: 'Dr. Lisa Chen', specialization: 'Dermatology' },
        { id: 4, name: 'Dr. David Wilson', specialization: 'Neurology' },
        { id: 5, name: 'Dr. Emily Davis', specialization: 'Pediatrics' }
    ]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'scheduled':
                return <Badge bg="primary">Scheduled</Badge>;
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
            time: appointment.time,
            doctor: appointment.doctor,
            type: appointment.type,
            reason: ''
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
        // ...existing code for book/reschedule (should be updated to use backend as well)
        setShowModal(false);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const dateFilter = null; // could derive from selectedDate if desired
            const { items, meta } = await listAppointments({ date: dateFilter, page });
            // Normalize date/time for display
            const normalized = items.map(a => ({
                ...a,
                date: new Date(a.date),
                time: a.time,
                doctor: a.doctor?.first_name || a.doctor?.email || a.doctor || 'Doctor',
                patient: a.patient?.first_name || a.patient?.email || a.patient || 'Patient',
                specialization: a.type || 'General'
            }));
            setAppointments(normalized);
            setMeta(meta);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page]);

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

    const totalPages = meta.count ? Math.ceil(meta.count / 25) : 1;

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>
                            <FontAwesomeIcon icon="calendar" className="me-2 text-primary" />
                            Appointment Management
                        </h2>
                        {userRole === 'patient' && (
                            <Button variant="primary" onClick={handleBookAppointment}>
                                <FontAwesomeIcon icon="plus" className="me-2" />
                                Book Appointment
                            </Button>
                        )}
                    </div>
                </Col>
            </Row>

            <Row>
                {/* Calendar View */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card">
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
                        </Card.Body>
                    </Card>
                </Col>

                {/* Appointments List */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="list" className="me-2" />
                            {userRole === 'doctor' ? 'My Schedule' : 'My Appointments'}
                        </Card.Header>
                        <Card.Body>
                            {error && (
                                <Alert variant="danger" className="d-flex align-items-center">
                                    <FontAwesomeIcon icon="exclamation-circle" className="me-2" />
                                    {error}
                                </Alert>
                            )}
                            {loading && (
                                <div className="mb-3"><em>Loading appointments...</em></div>
                            )}
                            {!loading && appointments.length === 0 ? (
                                <Alert variant="info">
                                    <FontAwesomeIcon icon="info-circle" className="me-2" />
                                    No appointments scheduled.
                                </Alert>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            {userRole === 'doctor' ? <th>Patient</th> : <th>Doctor</th>}
                                            <th>Type</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.map((appointment) => (
                                            <tr key={appointment.id}>
                                                <td>{appointment.date.toLocaleDateString()}</td>
                                                <td>{appointment.time}</td>
                                                <td>
                                                    {userRole === 'doctor' ? appointment.patient : appointment.doctor}
                                                    {userRole === 'patient' && (
                                                        <div>
                                                            <small className="text-muted">{appointment.specialization}</small>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{appointment.type}</td>
                                                <td>{getStatusBadge(appointment.status)}</td>
                                                <td>
                                                    {appointment.status === 'scheduled' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-warning"
                                                                className="me-1"
                                                                onClick={() => handleReschedule(appointment)}
                                                            >
                                                                <FontAwesomeIcon icon="edit" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                className="me-1"
                                                                onClick={() => handleCancel(appointment)}
                                                            >
                                                                <FontAwesomeIcon icon="times" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-success"
                                                                onClick={() => handleJoinVideo(appointment)}
                                                                disabled={!appointment.video_link}
                                                            >
                                                                <FontAwesomeIcon icon="video" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {appointment.status === 'completed' && (
                                                        <Button size="sm" variant="outline-info">
                                                            <FontAwesomeIcon icon="eye" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <small className="text-muted">Total: {meta.count}</small>
                                <div>
                                    <Button size="sm" variant="outline-secondary" className="me-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                                    <span className="me-2">Page {page} / {totalPages}</span>
                                    <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Appointment Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon
                            icon={
                                modalType === 'book' ? 'plus' :
                                    modalType === 'reschedule' ? 'edit' : 'times'
                            }
                            className="me-2"
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
                                Are you sure you want to cancel this appointment with {selectedAppointment?.doctor} on {selectedAppointment?.date.toLocaleDateString()} at {selectedAppointment?.time}?
                            </Alert>
                        ) : (
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Date</Form.Label>
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
                                        <Form.Label>Time</Form.Label>
                                        <Form.Select
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            required
                                        >
                                            <option value="">Select time</option>
                                            {availableTimes.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Doctor</Form.Label>
                                        <Form.Select
                                            value={formData.doctor}
                                            onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                                            required
                                        >
                                            <option value="">Select doctor</option>
                                            {doctors.map(doctor => (
                                                <option key={doctor.id} value={doctor.name}>
                                                    {doctor.name} - {doctor.specialization}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Appointment Type</Form.Label>
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
                                        <Form.Label>Reason for Visit</Form.Label>
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

export default AppointmentManagement;