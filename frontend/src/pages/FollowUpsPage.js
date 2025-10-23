import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { useAuth } from '../context/AuthContext';
import { listFollowUps, completeFollowUp, cancelFollowUp, listAtRiskMedications, createMedicationFollowUp } from '../services/prescriptionService';

const FollowUpsPage = () => {
    // const { user } = useAuth();
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [atRisk, setAtRisk] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [reasonFilter, setReasonFilter] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [fu, risk] = await Promise.all([
                listFollowUps(),
                listAtRiskMedications()
            ]);
            setFollowUps(Array.isArray(fu) ? fu : []);
            setAtRisk(Array.isArray(risk) ? risk : []);
        } catch (e) {
            setError(e.message || 'Failed to load follow-ups');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const riskBadge = (level) => level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';

    const onComplete = async (fu) => {
        try { await completeFollowUp(fu.id); await loadData(); } catch (e) { alert(e.message || 'Failed to complete'); }
    };
    const onCancel = async (fu) => {
        try { await cancelFollowUp(fu.id); await loadData(); } catch (e) { alert(e.message || 'Failed to cancel'); }
    };
    const onCreateForMed = async (m) => {
        try {
            // Default schedule: tomorrow at 10:00
            const d = new Date(); d.setDate(d.getDate() + 1);
            const date = d.toISOString().slice(0, 10);
            const time = '10:00';
            const scheduled_at = `${date}T${time}`;
            await createMedicationFollowUp(m.id, {
                reason: m.risk_level === 'high' ? 'high_risk' : 'low_compliance',
                scheduled_at
            });
            await loadData();
        } catch (e) { alert(e.message || 'Failed to create follow-up'); }
    };

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <h2><FontAwesomeIcon icon="flag" className="me-2 text-primary" /> Follow-Ups</h2>
                    <p className="text-muted">Manage compliance follow-ups and review at-risk medications</p>
                </Col>
            </Row>

            {loading && <Card className="medical-card"><Card.Body>Loading...</Card.Body></Card>}
            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && (
                <Row>
                    <Col lg={7} className="mb-4">
                        <Card className="medical-card h-100">
                            <Card.Header className="fw-bold text-dark">
                                <FontAwesomeIcon icon="tasks" className="me-2" /> Pending Follow-Ups
                            </Card.Header>
                            <Card.Body>
                                <Row className="mb-3 g-2">
                                    <Col md={4}>
                                        <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                            <option value="">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                            <option value="canceled">Canceled</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}>
                                            <option value="">All Reasons</option>
                                            <option value="high_risk">High Risk</option>
                                            <option value="refill_needed">Refill Needed</option>
                                            <option value="no_logs">No Logs</option>
                                            <option value="low_compliance">Low Compliance</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={4} className="text-end">
                                        <Button size="sm" variant="outline-secondary" onClick={loadData}>
                                            Refresh
                                        </Button>
                                    </Col>
                                </Row>
                                {followUps.filter(f => (!statusFilter || f.status === statusFilter) && (!reasonFilter || f.reason === reasonFilter)).length === 0 ? (
                                    <Alert variant="info">No pending follow-ups.</Alert>
                                ) : (
                                    <Table hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Patient</th>
                                                <th>Medication</th>
                                                <th>Reason</th>
                                                <th>Due</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {followUps
                                                .filter(f => (!statusFilter || f.status === statusFilter) && (!reasonFilter || f.reason === reasonFilter))
                                                .map(f => (
                                                    <tr key={f.id}>
                                                        <td>{f.patient_email || f.patient}</td>
                                                        <td>{f.medication_name || f.medication || '-'}</td>
                                                        <td><Badge bg="secondary">{f.reason}</Badge></td>
                                                        <td>{f.due_at ? new Date(f.due_at).toLocaleString() : '-'}</td>
                                                        <td className="d-flex gap-2">
                                                            <Button size="sm" variant="success" onClick={() => onComplete(f)}>Complete</Button>
                                                            <Button size="sm" variant="outline-secondary" onClick={() => onCancel(f)}>Cancel</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={5} className="mb-4">
                        <Card className="medical-card h-100">
                            <Card.Header className="fw-bold text-dark">
                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" /> At-Risk Medications
                            </Card.Header>
                            <Card.Body>
                                {atRisk.length === 0 ? (
                                    <Alert variant="info">No at-risk medications found.</Alert>
                                ) : (
                                    <Table hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Medication</th>
                                                <th>Patient</th>
                                                <th>Risk</th>
                                                <th>Pills</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {atRisk.map(m => (
                                                <tr key={m.id}>
                                                    <td>{m.name}</td>
                                                    <td>{m.patient_name || m.patient}</td>
                                                    <td>
                                                        <Badge bg={riskBadge(m.risk_level)}>
                                                            {m.risk_level.toUpperCase()} ({Math.round((m.risk_score || 0) * 100)}%)
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge bg={(m.remaining_quantity <= 0 ? 'danger' : (m.remaining_quantity <= (m.refill_threshold || 0) ? 'warning' : 'secondary'))}>
                                                            {m.remaining_quantity ?? '-'} / {m.total_quantity ?? '-'}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-end">
                                                        <Button size="sm" variant="outline-danger" onClick={() => onCreateForMed(m)}>
                                                            Create Follow-Up
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default FollowUpsPage;
