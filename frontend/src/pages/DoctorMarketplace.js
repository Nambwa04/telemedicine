import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { listDoctors, createDoctorRequest } from '../services/doctorService';
import '../styles/DoctorMarketplace.css';

const DoctorMarketplace = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [requestForm, setRequestForm] = useState({
        reason: '',
        symptoms: '',
        preferredDate: '',
        preferredTime: '',
        urgent: false,
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const data = await listDoctors();
            setDoctors(data);
        } catch (error) {
            setAlert({ type: 'danger', message: 'Failed to load doctors' });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestClick = (doctor) => {
        setSelectedDoctor(doctor);
        setShowRequestModal(true);
        setRequestForm({
            reason: '',
            symptoms: '',
            preferredDate: '',
            preferredTime: '',
            urgent: false,
            notes: ''
        });
    };

    const handleCloseModal = () => {
        setShowRequestModal(false);
        setSelectedDoctor(null);
        setRequestForm({
            reason: '',
            symptoms: '',
            preferredDate: '',
            preferredTime: '',
            urgent: false,
            notes: ''
        });
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRequestForm({
            ...requestForm,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setAlert(null);

        try {
            const result = await createDoctorRequest({
                doctorId: selectedDoctor.id,
                reason: requestForm.reason,
                symptoms: requestForm.symptoms,
                preferredDate: requestForm.preferredDate || null,
                preferredTime: requestForm.preferredTime || null,
                urgent: requestForm.urgent,
                notes: requestForm.notes
            });

            if (result.success) {
                setAlert({
                    type: 'success',
                    message: `Request sent to ${selectedDoctor.name}! You will be notified when they respond.`
                });
                handleCloseModal();
            } else {
                setAlert({
                    type: 'danger',
                    message: result.error || 'Failed to send request'
                });
            }
        } catch (error) {
            setAlert({
                type: 'danger',
                message: 'An unexpected error occurred'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDoctors = doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <Container className="doctor-marketplace py-4">
            <h2 className="mb-4">Find Your Doctor</h2>

            {alert && (
                <Alert
                    variant={alert.type}
                    dismissible
                    onClose={() => setAlert(null)}
                    className="mb-3"
                >
                    {alert.message}
                </Alert>
            )}

            <Form.Group className="mb-4">
                <Form.Control
                    type="text"
                    placeholder="Search doctors by name or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="lg"
                />
            </Form.Group>

            <Row>
                {filteredDoctors.length === 0 ? (
                    <Col>
                        <Alert variant="info">
                            No doctors found. Please try a different search term.
                        </Alert>
                    </Col>
                ) : (
                    filteredDoctors.map(doctor => (
                        <Col md={6} lg={4} key={doctor.id} className="mb-4">
                            <Card className="doctor-card h-100 shadow-sm">
                                <Card.Body>
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="doctor-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                                            <FontAwesomeIcon icon="user-md" size="lg" />
                                        </div>
                                        <div className="ms-3 flex-grow-1">
                                            <h5 className="mb-0">{doctor.name}</h5>
                                            {doctor.verified && (
                                                <Badge bg="success" className="mt-1">
                                                    <FontAwesomeIcon icon="certificate" size="xs" className="me-1" />
                                                    Verified
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <Badge bg="info" className="me-2">{doctor.specialization}</Badge>
                                        <div className="mt-2">
                                            <FontAwesomeIcon icon="star" className="text-warning me-1" />
                                            <span className="fw-bold">{doctor.rating}</span>
                                            <span className="text-muted"> ({doctor.reviewCount} reviews)</span>
                                        </div>
                                    </div>

                                    <p className="text-muted small mb-3">{doctor.bio}</p>

                                    <div className="doctor-details small mb-3">
                                        <div className="mb-2">
                                            <FontAwesomeIcon icon="map-marker-alt" className="text-primary me-2" />
                                            {doctor.location}
                                        </div>
                                        <div className="mb-2">
                                            <FontAwesomeIcon icon="clock" className="text-primary me-2" />
                                            {doctor.availability}
                                        </div>
                                        <div className="mb-2">
                                            <FontAwesomeIcon icon="dollar-sign" className="text-primary me-2" />
                                            ${doctor.consultationFee} per consultation
                                        </div>
                                        <div className="mb-2">
                                            <FontAwesomeIcon icon="language" className="text-primary me-2" />
                                            {doctor.languages.join(', ')}
                                        </div>
                                        <div className="text-muted">
                                            <strong>{doctor.experience}</strong> years experience •
                                            <strong> {doctor.patientsServed}</strong> patients served
                                        </div>
                                    </div>

                                    {doctor.certifications && doctor.certifications.length > 0 && (
                                        <div className="mb-3">
                                            {doctor.certifications.map((cert, index) => (
                                                <Badge key={index} bg="secondary" className="me-1 mb-1">
                                                    {cert}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        variant="primary"
                                        className="w-100"
                                        onClick={() => handleRequestClick(doctor)}
                                    >
                                        Request Doctor
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                )}
            </Row>

            {/* Request Modal */}
            <Modal show={showRequestModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Request Assignment - {selectedDoctor?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmitRequest}>
                        <Form.Group className="mb-3">
                            <Form.Label>Reason for Consultation *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                name="reason"
                                value={requestForm.reason}
                                onChange={handleFormChange}
                                placeholder="Brief description of why you need to see this doctor"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Symptoms</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="symptoms"
                                value={requestForm.symptoms}
                                onChange={handleFormChange}
                                placeholder="Describe your symptoms (optional)"
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Preferred Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="preferredDate"
                                        value={requestForm.preferredDate}
                                        onChange={handleFormChange}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Preferred Time</Form.Label>
                                    <Form.Control
                                        type="time"
                                        name="preferredTime"
                                        value={requestForm.preferredTime}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Additional Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                name="notes"
                                value={requestForm.notes}
                                onChange={handleFormChange}
                                placeholder="Any other information you'd like the doctor to know"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                name="urgent"
                                label="This is an urgent request"
                                checked={requestForm.urgent}
                                onChange={handleFormChange}
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting ? 'Sending...' : 'Send Request'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default DoctorMarketplace;
