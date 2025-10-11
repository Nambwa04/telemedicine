import React, { useState, useEffect, useCallback } from 'react';
import { fetchPrescriptions, logMedicationIntake, getMedicationLogs } from '../../services/prescriptionService';
import { useAuth } from '../../context/AuthContext';
import { Container, Row, Col, Card, Button, Badge, Alert, ProgressBar, Modal, Form, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fetchPatientList } from '../../services/healthService';
import '../../styles/MedicationTracking.css';

const MedicationTracking = ({ userRole = 'patient' }) => {
    const { user } = useAuth();
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Modal states
    const [showLogModal, setShowLogModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [medicationLogs, setMedicationLogs] = useState([]);
    const [logNotes, setLogNotes] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let patientId = user?.id;
            if (userRole === 'caregiver') {
                if (!selectedPatient) {
                    setMedications([]);
                    setLoading(false);
                    return;
                }
                patientId = selectedPatient.id;
            }
            const data = await fetchPrescriptions(patientId);
            setMedications(Array.isArray(data) ? data : []);
        } catch (e) {
            setError('Failed to load medications');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, userRole, selectedPatient?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (userRole === 'caregiver') {
            fetchPatientList().then(setPatients).catch(() => setPatients([]));
        }
    }, [userRole]);

    const handleLogIntake = async () => {
        if (!selectedMedication) return;

        try {
            await logMedicationIntake(selectedMedication.id, {
                doses_taken: 1,
                notes: logNotes
            });
            setShowLogModal(false);
            setLogNotes('');
            fetchData(); // Refresh data
            alert('Medication intake logged successfully!');
        } catch (e) {
            alert('Failed to log medication intake: ' + (e.message || 'Unknown error'));
        }
    };

    const handleViewHistory = async (medication) => {
        setSelectedMedication(medication);
        try {
            const logs = await getMedicationLogs(medication.id);
            setMedicationLogs(logs);
            setShowHistoryModal(true);
        } catch (e) {
            alert('Failed to load medication history');
        }
    };

    const getComplianceColor = (rate) => {
        if (rate >= 80) return 'success';
        if (rate >= 60) return 'warning';
        return 'danger';
    };

    const getQuantityColor = (remaining, threshold) => {
        if (remaining <= 0) return 'danger';
        if (remaining <= threshold) return 'warning';
        return 'success';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Container fluid className="medication-tracking fade-in">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <FontAwesomeIcon icon="pills" className="me-2 text-primary" />
                        Medication Management
                    </h2>
                    <p className="text-muted">Track your medications, doses, and compliance</p>
                </Col>
            </Row>

            {/* Caregiver patient selection */}
            {userRole === 'caregiver' && (
                <Row className="mb-3">
                    <Col md={6}>
                        <Card className="medical-card">
                            <Card.Body>
                                <Form.Group>
                                    <Form.Label>
                                        <FontAwesomeIcon icon="user" className="me-2" />
                                        Select Patient
                                    </Form.Label>
                                    <Form.Select
                                        value={selectedPatient?.id || ''}
                                        onChange={e => {
                                            const p = patients.find(pt => pt.id === parseInt(e.target.value));
                                            setSelectedPatient(p);
                                        }}
                                    >
                                        <option value="">-- Select Patient --</option>
                                        {patients.map(pt => (
                                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Loading/Error States */}
            {loading && (
                <Card className="medical-card text-center py-5">
                    <Card.Body>
                        <FontAwesomeIcon icon="spinner" spin size="3x" className="text-primary mb-3" />
                        <p className="text-muted">Loading medications...</p>
                    </Card.Body>
                </Card>
            )}

            {error && (
                <Alert variant="danger" className="d-flex align-items-center">
                    <FontAwesomeIcon icon="exclamation-circle" className="me-2" />
                    {error}
                </Alert>
            )}

            {/* Medications Cards */}
            {!loading && medications.length > 0 && (
                <Row>
                    {medications.map(med => (
                        <Col key={med.id} lg={6} className="mb-4">
                            <Card className="medical-card medication-card h-100">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h4 className="mb-1">
                                                <FontAwesomeIcon icon="prescription-bottle" className="me-2 text-primary" />
                                                {med.name}
                                            </h4>
                                            <p className="text-muted mb-0">
                                                <strong>{med.dosage}</strong> · {med.frequency}
                                            </p>
                                        </div>
                                        {med.needs_refill && (
                                            <Badge bg="warning" className="refill-badge">
                                                <FontAwesomeIcon icon="exclamation-triangle" className="me-1" />
                                                Refill Needed
                                            </Badge>
                                        )}
                                        {med.is_depleted && (
                                            <Badge bg="danger" className="refill-badge">
                                                <FontAwesomeIcon icon="times-circle" className="me-1" />
                                                Out of Stock
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Quantity Progress */}
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <small className="text-muted">
                                                <FontAwesomeIcon icon="capsules" className="me-1" />
                                                Remaining Supply
                                            </small>
                                            <strong className={`text-${getQuantityColor(med.remaining_quantity, med.refill_threshold)}`}>
                                                {med.remaining_quantity} / {med.total_quantity} doses
                                            </strong>
                                        </div>
                                        <ProgressBar
                                            now={(med.remaining_quantity / med.total_quantity) * 100}
                                            variant={getQuantityColor(med.remaining_quantity, med.refill_threshold)}
                                            className="medication-progress"
                                        />
                                    </div>

                                    {/* Compliance Rate */}
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <small className="text-muted">
                                                <FontAwesomeIcon icon="check-circle" className="me-1" />
                                                Compliance Rate (30 days)
                                            </small>
                                            <strong className={`text-${getComplianceColor(med.compliance_rate)}`}>
                                                {med.compliance_rate}%
                                            </strong>
                                        </div>
                                        <ProgressBar
                                            now={med.compliance_rate}
                                            variant={getComplianceColor(med.compliance_rate)}
                                            className="compliance-progress"
                                        />
                                    </div>

                                    {/* Dates */}
                                    <Row className="mb-3 text-center">
                                        <Col xs={6}>
                                            <small className="text-muted d-block">Start Date</small>
                                            <strong>{formatDate(med.start_date)}</strong>
                                        </Col>
                                        {med.next_due && (
                                            <Col xs={6}>
                                                <small className="text-muted d-block">Next Due</small>
                                                <strong className="text-primary">{formatDate(med.next_due)}</strong>
                                            </Col>
                                        )}
                                    </Row>

                                    {/* Recent Logs */}
                                    {med.recent_logs && med.recent_logs.length > 0 && (
                                        <div className="recent-logs mb-3">
                                            <small className="text-muted d-block mb-2">
                                                <FontAwesomeIcon icon="history" className="me-1" />
                                                Recent Activity
                                            </small>
                                            {med.recent_logs.slice(0, 3).map((log, idx) => (
                                                <div key={idx} className="log-entry">
                                                    <FontAwesomeIcon icon="check" className="text-success me-2" size="sm" />
                                                    <small>
                                                        Taken on {formatDate(log.taken_at)} at {formatTime(log.taken_at)}
                                                    </small>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                setSelectedMedication(med);
                                                setShowLogModal(true);
                                            }}
                                        >
                                            <FontAwesomeIcon icon="check-circle" className="me-2" />
                                            Log Dose Taken
                                        </Button>
                                        <Button
                                            variant="outline-primary"
                                            onClick={() => handleViewHistory(med)}
                                        >
                                            <FontAwesomeIcon icon="clipboard-list" className="me-2" />
                                            View Full History
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Empty State */}
            {!loading && medications.length === 0 && (
                <Card className="medical-card text-center py-5">
                    <Card.Body>
                        <FontAwesomeIcon icon="prescription-bottle-alt" size="3x" className="text-muted mb-3 opacity-50" />
                        <h5>No Medications Found</h5>
                        <p className="text-muted">
                            {userRole === 'caregiver'
                                ? 'Select a patient to view their medications'
                                : 'You don\'t have any medications prescribed yet'}
                        </p>
                    </Card.Body>
                </Card>
            )}

            {/* Log Intake Modal */}
            <Modal show={showLogModal} onHide={() => setShowLogModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="check-circle" className="me-2 text-primary" />
                        Log Medication Intake
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedMedication && (
                        <>
                            <h5>{selectedMedication.name}</h5>
                            <p className="text-muted">{selectedMedication.dosage}</p>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon="comment" className="me-2" />
                                    Notes (Optional)
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={logNotes}
                                    onChange={(e) => setLogNotes(e.target.value)}
                                    placeholder="Any side effects or observations..."
                                />
                            </Form.Group>

                            <Alert variant="info" className="small">
                                <FontAwesomeIcon icon="info-circle" className="me-2" />
                                This will record that you took 1 dose now and update your remaining supply.
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowLogModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleLogIntake}>
                        <FontAwesomeIcon icon="check" className="me-2" />
                        Confirm Intake
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* History Modal */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="clipboard-list" className="me-2 text-primary" />
                        Medication History
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedMedication && (
                        <>
                            <h5 className="mb-3">{selectedMedication.name}</h5>

                            {medicationLogs.length > 0 ? (
                                <Table striped hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Doses</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {medicationLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{formatDate(log.taken_at)}</td>
                                                <td>{formatTime(log.taken_at)}</td>
                                                <td>
                                                    <Badge bg="success">{log.doses_taken}</Badge>
                                                </td>
                                                <td>{log.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <Alert variant="info">
                                    No intake history recorded yet for this medication.
                                </Alert>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MedicationTracking;
