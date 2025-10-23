import React, { useState, useEffect, useCallback } from 'react';
import { fetchPrescriptions, logMedicationIntake, getMedicationLogs, createMedicationFollowUp, scanAndCreateFollowUps, listFollowUps, completeFollowUp, cancelFollowUp } from '../../services/prescriptionService';
import { useAuth } from '../../context/AuthContext';
import { Container, Row, Col, Card, Button, Badge, Alert, ProgressBar, Modal, Form, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fetchPatientList } from '../../services/healthService';
import '../../styles/MedicationTracking.css';

const MedicationTracking = ({ userRole = 'patient' }) => {
    const { user } = useAuth();
    const role = user?.role || userRole;
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
    // Follow-ups state
    const [showFollowUpsModal, setShowFollowUpsModal] = useState(false);
    const [followUps, setFollowUps] = useState([]);
    const [fuLoading, setFuLoading] = useState(false);
    // Create Follow-Up modal state
    const [showCreateFU, setShowCreateFU] = useState(false);
    const [fuMedication, setFuMedication] = useState(null);
    const [fuReason, setFuReason] = useState('high_risk');
    const [fuNotes, setFuNotes] = useState('');
    const [fuSubmitting, setFuSubmitting] = useState(false);
    const [fuDate, setFuDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
    });
    const [fuTime, setFuTime] = useState('10:00');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let patientId = user?.id;
            if (role === 'caregiver') {
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
    }, [user?.id, role, selectedPatient]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (role === 'caregiver') {
            fetchPatientList().then(setPatients).catch(() => setPatients([]));
        }
    }, [role]);

    const riskVariant = (riskLevel) => {
        if (riskLevel === 'high') return 'danger';
        if (riskLevel === 'medium') return 'warning';
        return 'success';
    };

    const suggestReason = (med) => {
        if (med?.needs_refill) return 'refill_needed';
        if (med?.risk_level === 'high') return 'high_risk';
        if ((med?.compliance_rate ?? 100) < 80) return 'low_compliance';
        return 'high_risk';
    };

    const openCreateFollowUp = (med) => {
        setFuMedication(med);
        setFuReason(suggestReason(med));
        setFuNotes('');
        const d = new Date(); d.setDate(d.getDate() + 1);
        setFuDate(d.toISOString().slice(0, 10));
        setFuTime('10:00');
        setShowCreateFU(true);
    };

    const handleSubmitCreateFU = async () => {
        if (!fuMedication) return;
        try {
            setFuSubmitting(true);
            const scheduled_at = (fuDate && fuTime) ? `${fuDate}T${fuTime}` : undefined;
            await createMedicationFollowUp(
                fuMedication.id,
                { reason: fuReason, notes: fuNotes, scheduled_at }
            );
            setShowCreateFU(false);
            setFuMedication(null);
            setFuNotes('');
            alert('Follow-up created');
            if (showFollowUpsModal) {
                await refreshFollowUps();
            }
            // Optimistically bump the pending follow-ups count on the card
            setMedications(prev => prev.map(m => m.id === fuMedication.id
                ? { ...m, pending_followups_count: (m.pending_followups_count || 0) + 1 }
                : m
            ));
        } catch (e) {
            alert('Failed to create follow-up: ' + (e.message || 'Unknown error'));
        } finally {
            setFuSubmitting(false);
        }
    };

    const handleScanFollowUps = async () => {
        try {
            const res = await scanAndCreateFollowUps();
            alert('Scan complete. Created: ' + JSON.stringify(res.created));
        } catch (e) {
            alert('Scan failed: ' + (e.message || 'Unknown error'));
        }
    };

    const openFollowUps = async () => {
        try {
            setFuLoading(true);
            const data = await listFollowUps();
            setFollowUps(Array.isArray(data) ? data : []);
            setShowFollowUpsModal(true);
        } catch (e) {
            alert('Failed to load follow-ups');
        } finally {
            setFuLoading(false);
        }
    };

    const refreshFollowUps = async () => {
        try {
            const data = await listFollowUps();
            setFollowUps(Array.isArray(data) ? data : []);
        } catch { }
    };

    const handleCompleteFU = async (fu) => {
        try {
            await completeFollowUp(fu.id);
            await refreshFollowUps();
        } catch (e) {
            alert('Failed to complete follow-up: ' + (e.message || 'Unknown error'));
        }
    };

    const handleCancelFU = async (fu) => {
        try {
            await cancelFollowUp(fu.id);
            await refreshFollowUps();
        } catch (e) {
            alert('Failed to cancel follow-up: ' + (e.message || 'Unknown error'));
        }
    };

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
            {(role === 'caregiver' || role === 'doctor') && (
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
                                <div className="mt-3 d-flex gap-2">
                                    <Button variant="outline-secondary" size="sm" onClick={fetchData}>
                                        <FontAwesomeIcon icon="sync" className="me-2" /> Refresh
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={handleScanFollowUps}>
                                        <FontAwesomeIcon icon="bullhorn" className="me-2" /> Scan & Create Follow-Ups
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={openFollowUps}>
                                        <FontAwesomeIcon icon="list" className="me-2" /> View Follow-Ups
                                    </Button>
                                </div>
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
                                        {med.risk_level && (
                                            <Badge bg={riskVariant(med.risk_level)} className="ms-2">
                                                <FontAwesomeIcon icon="flag" className="me-1" />
                                                Risk: {med.risk_level.toUpperCase()} {typeof med.noncompliance_risk === 'number' ? `(${Math.round(med.noncompliance_risk * 100)}%)` : ''}
                                            </Badge>
                                        )}
                                        {(med.pending_followups_count > 0) && (
                                            <Badge bg="danger" className="ms-2">
                                                <FontAwesomeIcon icon="flag" className="me-1" />
                                                {med.pending_followups_count} follow-up{med.pending_followups_count > 1 ? 's' : ''}
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
                                            now={(med.total_quantity ? (med.remaining_quantity / med.total_quantity) * 100 : 0)}
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
                                        {(role === 'caregiver' || role === 'doctor') && (
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => openCreateFollowUp(med)}
                                            >
                                                <FontAwesomeIcon icon="bullhorn" className="me-2" />
                                                Create Follow-Up
                                            </Button>
                                        )}
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

            {/* Follow-Ups Modal */}
            <Modal show={showFollowUpsModal} onHide={() => setShowFollowUpsModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="flag" className="me-2 text-primary" />
                        Compliance Follow-Ups
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {fuLoading ? (
                        <div className="text-center py-4">
                            <FontAwesomeIcon icon="spinner" spin className="text-primary" /> Loading...
                        </div>
                    ) : followUps.length > 0 ? (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Medication</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Due</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {followUps.map(fu => (
                                    <tr key={fu.id}>
                                        <td>{fu.patient_email || fu.patient}</td>
                                        <td>{fu.medication_name || (fu.medication || '-')}</td>
                                        <td><Badge bg="secondary">{fu.reason}</Badge></td>
                                        <td>
                                            <Badge bg={{ pending: 'warning', completed: 'success', canceled: 'secondary' }[fu.status] || 'secondary'}>
                                                {fu.status}
                                            </Badge>
                                        </td>
                                        <td>{fu.due_at ? new Date(fu.due_at).toLocaleString() : '-'}</td>
                                        <td className="d-flex gap-2">
                                            {fu.status === 'pending' && (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => handleCompleteFU(fu)}>
                                                        Complete
                                                    </Button>
                                                    <Button size="sm" variant="outline-secondary" onClick={() => handleCancelFU(fu)}>
                                                        Cancel
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert variant="info">No follow-ups found.</Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowFollowUpsModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Create Follow-Up Modal */}
            <Modal show={showCreateFU} onHide={() => setShowCreateFU(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="flag" className="me-2 text-primary" />
                        Create Follow-Up
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {fuMedication && (
                        <>
                            <h5 className="mb-2">{fuMedication.name}</h5>
                            <p className="text-muted mb-3">{fuMedication.dosage} · {fuMedication.frequency}</p>
                            <Row className="g-2">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Date</Form.Label>
                                        <Form.Control type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Time</Form.Label>
                                        <Form.Control type="time" value={fuTime} onChange={e => setFuTime(e.target.value)} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Reason</Form.Label>
                                <Form.Select value={fuReason} onChange={(e) => setFuReason(e.target.value)}>
                                    <option value="high_risk">High risk</option>
                                    <option value="refill_needed">Refill needed</option>
                                    <option value="no_logs">No recent logs</option>
                                    <option value="low_compliance">Low compliance</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Notes (optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={fuNotes}
                                    onChange={(e) => setFuNotes(e.target.value)}
                                    placeholder="Add any context for this follow-up..."
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateFU(false)} disabled={fuSubmitting}>Cancel</Button>
                    <Button variant="danger" onClick={handleSubmitCreateFU} disabled={fuSubmitting}>
                        {fuSubmitting ? (
                            <>
                                <FontAwesomeIcon icon="spinner" spin className="me-2" /> Creating...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="bullhorn" className="me-2" /> Create Follow-Up
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MedicationTracking;
