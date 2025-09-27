import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Table, Tab, Nav, Alert, ProgressBar, Spinner, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchPatientMetrics, fetchPatientList, mapTrendLabel } from '../../services/healthService';
import { useAuth } from '../../context/AuthContext';

// PatientHealthDashboard: patient-specific dashboard that can also optionally show a patient list for doctor/caregiver roles.
// This replaces the generic SharedHealthDashboard for patient view while preserving structure.

const PatientHealthDashboard = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'patient';
    const patientId = user?.id || 'self';

    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [patients, setPatients] = useState([]);
    const [activeTab, setActiveTab] = useState('vitals');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [error, setError] = useState('');

    const showPatientSelector = userRole !== 'patient';

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const data = await fetchPatientMetrics(patientId);
                if (!mounted) return;
                setMetrics(data);
                if (showPatientSelector) {
                    const list = await fetchPatientList();
                    if (!mounted) return;
                    setPatients(list);
                }
            } catch (e) {
                setError(e.message || 'Failed to load metrics');
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [patientId, showPatientSelector]);

    useEffect(() => {
        if (selectedPatient && selectedPatient.id !== patientId) {
            (async () => {
                setLoading(true);
                try {
                    const data = await fetchPatientMetrics(selectedPatient.id);
                    setMetrics(data);
                } catch (e) {
                    setError(e.message || 'Failed to switch patient');
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [selectedPatient, patientId]);

    const overview = metrics?.overview || {};

    // (Removed unused pieChartSummary computation to satisfy ESLint no-unused-vars)

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" />
                <div className="mt-2">Loading health data...</div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h2 className="mb-1">
                                <FontAwesomeIcon icon="chart-line" className="me-2 text-primary" />
                                {userRole === 'patient' ? 'Your Health Dashboard' : 'Patient Health Dashboard'}
                            </h2>
                            <p className="text-muted mb-0">
                                {userRole === 'patient' ? 'Personalized health metrics and tracking' : 'Select a patient to view metrics'}
                            </p>
                        </div>
                        {showPatientSelector && (
                            <Form.Select
                                value={selectedPatient?.id || ''}
                                onChange={(e) => {
                                    const p = patients.find(pt => pt.id === Number(e.target.value));
                                    setSelectedPatient(p || null);
                                }}
                                style={{ width: '260px' }}
                            >
                                <option value="">Current Patient: {user?.name || 'You'}</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - {p.condition}</option>
                                ))}
                            </Form.Select>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Overview Cards */}
            <Row className="mb-4">
                {['bloodPressure', 'heartRate', 'weight', 'bloodSugar', 'temperature'].map(key => {
                    const item = overview[key];
                    if (!item) return null;
                    const trend = mapTrendLabel(item.trend);
                    const labels = {
                        bloodPressure: 'Blood Pressure', heartRate: 'Heart Rate', weight: 'Weight', bloodSugar: 'Blood Sugar', temperature: 'Temperature'
                    };
                    const icons = {
                        bloodPressure: 'heartbeat', heartRate: 'heart', weight: 'weight', bloodSugar: 'tint', temperature: 'thermometer-half'
                    };
                    return (
                        <Col key={key} lg={2} md={4} sm={6} className="mb-3">
                            <Card className="medical-card h-100">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon={icons[key]} size="2x" className="text-primary mb-2" />
                                    <h6>{labels[key]}</h6>
                                    <h4 className="text-primary">{key === 'heartRate' ? `${item.current} BPM` : key === 'weight' ? `${item.current} lbs` : key === 'temperature' ? `${item.current}°F` : item.current}</h4>
                                    <div className="small">
                                        <FontAwesomeIcon icon={trend.icon} className={`text-${trend.color} me-1`} />
                                        {trend.text}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    );
                })}
                <Col lg={2} md={4} sm={6} className="mb-3">
                    <Card className="medical-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="pills" size="2x" className="text-primary mb-2" />
                            <h6>Medications</h6>
                            <h4 className="text-primary">{metrics?.medications?.length || 0}</h4>
                            <div className="small"><FontAwesomeIcon icon="check" className="text-success me-1" />Active</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                        <Card className="medical-card">
                            <Card.Header>
                                <Nav variant="tabs">
                                    <Nav.Item>
                                        <Nav.Link eventKey="vitals"><FontAwesomeIcon icon="chart-line" className="me-1" />Vitals</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="medications"><FontAwesomeIcon icon="pills" className="me-1" />Medications</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="labs"><FontAwesomeIcon icon="flask" className="me-1" />Labs</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="symptoms"><FontAwesomeIcon icon="notes-medical" className="me-1" />Symptoms</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="appointments"><FontAwesomeIcon icon="calendar" className="me-1" />Appointments</Nav.Link>
                                    </Nav.Item>
                                    {showPatientSelector && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="patients"><FontAwesomeIcon icon="users" className="me-1" />Patient List</Nav.Link>
                                        </Nav.Item>
                                    )}
                                </Nav>
                            </Card.Header>
                            <Card.Body>
                                <Tab.Content>
                                    <Tab.Pane eventKey="vitals">
                                        <Row>
                                            <Col lg={8} className="mb-4">
                                                <h6>Blood Pressure</h6>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <LineChart data={metrics.vitals}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" /><YAxis /><Tooltip />
                                                        <Line type="monotone" dataKey="bloodPressure" stroke="#007bff" strokeWidth={3} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </Col>
                                            <Col lg={4} className="mb-4">
                                                <h6>Heart Rate</h6>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={metrics.vitals}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" /><YAxis /><Tooltip />
                                                        <Bar dataKey="heartRate" fill="#28a745" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="medications">
                                        <Table responsive>
                                            <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Compliance</th><th>Next Due</th></tr></thead>
                                            <tbody>
                                                {metrics.medications.map((m, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{m.name}</strong></td>
                                                        <td>{m.dosage}</td>
                                                        <td>{m.frequency}</td>
                                                        <td>
                                                            <div className="mb-1">
                                                                <ProgressBar now={m.compliance} variant={m.compliance >= 90 ? 'success' : m.compliance >= 80 ? 'warning' : 'danger'} style={{ height: '8px' }} />
                                                            </div>
                                                            <small>{m.compliance}%</small>
                                                        </td>
                                                        <td>{new Date(m.nextDue).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="labs">
                                        <Table responsive>
                                            <thead><tr><th>Test</th><th>Value</th><th>Range</th><th>Status</th><th>Date</th></tr></thead>
                                            <tbody>
                                                {metrics.labResults.map((r, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{r.test}</strong></td>
                                                        <td>{r.value}</td>
                                                        <td>{r.range}</td>
                                                        <td><Badge bg={r.status === 'normal' ? 'success' : r.status === 'good' ? 'primary' : r.status === 'borderline' ? 'warning' : r.status === 'high' ? 'danger' : 'secondary'}>{r.status}</Badge></td>
                                                        <td>{new Date(r.date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="symptoms">
                                        {metrics.symptoms.map((s, i) => (
                                            <Card key={i} className="mb-3">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between">
                                                        <div>
                                                            <h6 className="mb-1">{s.symptom} <Badge bg={s.severity <= 2 ? 'success' : s.severity <= 4 ? 'warning' : 'danger'}>Severity {s.severity}</Badge></h6>
                                                            <p className="mb-0 small text-muted">Duration: {s.duration}</p>
                                                            <p className="mb-0">{s.notes}</p>
                                                        </div>
                                                        <div className="text-muted small"><FontAwesomeIcon icon="calendar" className="me-1" />{new Date(s.date).toLocaleDateString()}</div>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="appointments">
                                        <Table responsive>
                                            <thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Notes</th></tr></thead>
                                            <tbody>
                                                {metrics.appointments.map((a, i) => (
                                                    <tr key={i}>
                                                        <td>{new Date(a.date).toLocaleDateString()}</td>
                                                        <td>{a.doctor}</td>
                                                        <td><Badge bg="primary">{a.type}</Badge></td>
                                                        <td>{a.notes}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Tab.Pane>
                                    {showPatientSelector && (
                                        <Tab.Pane eventKey="patients">
                                            <h6 className="mb-3">Patient List</h6>
                                            <Table responsive hover>
                                                <thead><tr><th>Name</th><th>Age</th><th>Condition</th><th>Last Visit</th><th></th></tr></thead>
                                                <tbody>
                                                    {patients.map(p => (
                                                        <tr key={p.id} className={selectedPatient?.id === p.id ? 'table-active' : ''}>
                                                            <td>{p.name}</td>
                                                            <td>{p.age}</td>
                                                            <td>{p.condition}</td>
                                                            <td>{p.lastVisit}</td>
                                                            <td>
                                                                <Button size="sm" variant="outline-primary" onClick={() => setSelectedPatient(p)}>View</Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Tab.Pane>
                                    )}
                                </Tab.Content>
                            </Card.Body>
                        </Card>
                    </Tab.Container>
                </Col>
            </Row>

            {/* Insights placeholder - can extend */}
            <Row className="mt-4">
                <Col>
                    <Card className="medical-card">
                        <Card.Header><FontAwesomeIcon icon="lightbulb" className="me-2" />Insights</Card.Header>
                        <Card.Body>
                            <Alert variant="info" className="mb-2">Blood pressure stable over last 5 days.</Alert>
                            <Alert variant="success" className="mb-0">Medication adherence excellent.</Alert>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default PatientHealthDashboard;
