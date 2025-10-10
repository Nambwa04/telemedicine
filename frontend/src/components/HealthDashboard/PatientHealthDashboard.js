import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Table, Tab, Nav, Alert, ProgressBar, Spinner, Form, Button, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchPatientMetrics, fetchPatientList, mapTrendLabel } from '../../services/healthService';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE from '../../config';

// PatientHealthDashboard: patient-specific dashboard that can also optionally show a patient list for doctor/caregiver roles.
// This replaces the generic SharedHealthDashboard for patient view while preserving structure.

const PatientHealthDashboard = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const userRole = user?.role || 'patient';

    // Get patientId from URL query params, or use logged-in user's ID
    const urlPatientId = searchParams.get('patientId');
    const currentPatientId = urlPatientId || user?.id || 'self';

    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [patients, setPatients] = useState([]);
    const [activeTab, setActiveTab] = useState('vitals');
    const [selectedPatientId, setSelectedPatientId] = useState(currentPatientId);
    const [error, setError] = useState('');

    // Lab Result Upload Modal State
    const [showLabModal, setShowLabModal] = useState(false);
    const [labFile, setLabFile] = useState(null);
    const [labLoading, setLabLoading] = useState(false);
    const [labError, setLabError] = useState('');
    const [labSuccess, setLabSuccess] = useState('');

    // Symptom Upload Modal State
    const [showSymptomModal, setShowSymptomModal] = useState(false);
    const [symptomFormData, setSymptomFormData] = useState({
        diagnosis: '',
        symptoms: '',
        severity: 'moderate',
        onset_date: new Date().toISOString().split('T')[0],
        notes: '',
        prescribed_treatment: ''
    });
    const [symptomLoading, setSymptomLoading] = useState(false);
    const [symptomError, setSymptomError] = useState('');
    const [symptomSuccess, setSymptomSuccess] = useState('');

    // Medication/Prescription Modal State
    const [showMedicationModal, setShowMedicationModal] = useState(false);
    const [medicationFormData, setMedicationFormData] = useState({
        name: '',
        dosage: '',
        frequency: '',
        next_due: new Date().toISOString().split('T')[0]
    });
    const [medicationLoading, setMedicationLoading] = useState(false);
    const [medicationError, setMedicationError] = useState('');
    const [medicationSuccess, setMedicationSuccess] = useState('');

    const showPatientSelector = userRole !== 'patient';

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchPatientMetrics(currentPatientId);
                if (!mounted) return;
                setMetrics(data);
                if (showPatientSelector) {
                    const list = await fetchPatientList();
                    if (!mounted) return;
                    setPatients(list);
                }
            } catch (e) {
                if (mounted) setError(e.message || 'Failed to load metrics');
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [currentPatientId, showPatientSelector]);

    // Handle patient selection from dropdown
    const handlePatientChange = (e) => {
        const newPatientId = e.target.value;
        setSelectedPatientId(newPatientId);
        if (newPatientId) {
            navigate(`/health-dashboard?patientId=${newPatientId}`);
        } else {
            navigate('/health-dashboard');
        }
    };

    // Handle Lab Result File Upload
    const handleLabSubmit = async (e) => {
        e.preventDefault();

        if (!labFile) {
            setLabError('Please select a file to upload');
            return;
        }

        setLabLoading(true);
        setLabError('');
        setLabSuccess('');

        try {
            const token = user?.access || localStorage.getItem('access');
            const formData = new FormData();
            formData.append('file', labFile);
            formData.append('patient_id', currentPatientId);
            formData.append('uploaded_by', user?.id || 'unknown');
            formData.append('upload_date', new Date().toISOString());

            const res = await fetch(`${API_BASE}/health/lab-results/upload/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to upload lab result');
            }

            setLabSuccess('Lab result uploaded successfully!');

            // Refresh metrics data
            const updatedData = await fetchPatientMetrics(currentPatientId);
            setMetrics(updatedData);

            // Reset form after 2 seconds
            setTimeout(() => {
                setShowLabModal(false);
                setLabFile(null);
                setLabSuccess('');
            }, 2000);
        } catch (err) {
            setLabError(err.message || 'Failed to upload lab result');
        } finally {
            setLabLoading(false);
        }
    };    // Handle Symptom Submission
    const handleSymptomSubmit = async (e) => {
        e.preventDefault();
        setSymptomLoading(true);
        setSymptomError('');
        setSymptomSuccess('');

        try {
            const token = user?.access || localStorage.getItem('access');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const payload = {
                ...symptomFormData,
                patient_id: currentPatientId,
                recorded_by: user?.id || 'unknown',
                recorded_by_role: userRole
            };

            const res = await fetch(`${API_BASE}/health/symptoms/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to record symptom/diagnosis');
            }

            setSymptomSuccess('Symptom and diagnosis recorded successfully!');

            // Refresh metrics data
            const updatedData = await fetchPatientMetrics(currentPatientId);
            setMetrics(updatedData);

            // Reset form after 2 seconds
            setTimeout(() => {
                setShowSymptomModal(false);
                setSymptomFormData({
                    diagnosis: '',
                    symptoms: '',
                    severity: 'moderate',
                    onset_date: new Date().toISOString().split('T')[0],
                    notes: '',
                    prescribed_treatment: ''
                });
                setSymptomSuccess('');
            }, 2000);
        } catch (err) {
            setSymptomError(err.message || 'Failed to record symptom/diagnosis');
        } finally {
            setSymptomLoading(false);
        }
    };

    // Handle Medication/Prescription Submit
    const handleMedicationSubmit = async (e) => {
        e.preventDefault();
        setMedicationLoading(true);
        setMedicationError('');
        setMedicationSuccess('');

        try {
            const token = user?.access || localStorage.getItem('access');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const payload = {
                patient: currentPatientId,
                name: medicationFormData.name,
                dosage: medicationFormData.dosage,
                frequency: medicationFormData.frequency,
                next_due: medicationFormData.next_due
            };

            const res = await fetch(`${API_BASE}/medications/prescriptions/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to add medication/prescription');
            }

            setMedicationSuccess('Medication prescribed successfully!');

            // Refresh metrics data
            const updatedData = await fetchPatientMetrics(currentPatientId);
            setMetrics(updatedData);

            // Reset form after 2 seconds
            setTimeout(() => {
                setShowMedicationModal(false);
                setMedicationFormData({
                    name: '',
                    dosage: '',
                    frequency: '',
                    next_due: new Date().toISOString().split('T')[0]
                });
                setMedicationSuccess('');
            }, 2000);
        } catch (err) {
            setMedicationError(err.message || 'Failed to add medication/prescription');
        } finally {
            setMedicationLoading(false);
        }
    };

    const overview = metrics?.overview || {};

    // Get current patient name for display
    const currentPatient = patients.find(p => p.id === parseInt(currentPatientId)) || null;

    // Generate dynamic insights based on actual data
    const generateInsights = () => {
        const insights = [];
        const missingVitals = [];

        // Check for missing vital signs
        const vitalChecks = [
            { key: 'bloodPressure', label: 'blood pressure' },
            { key: 'heartRate', label: 'heart rate' },
            { key: 'weight', label: 'weight' },
            { key: 'bloodSugar', label: 'blood sugar' }
        ];

        vitalChecks.forEach(vital => {
            if (!overview[vital.key] || !overview[vital.key].current) {
                missingVitals.push(vital.label);
            }
        });

        // Alert if critical vitals are missing
        if (missingVitals.length > 0) {
            insights.push({
                type: 'info',
                message: `Missing data for: ${missingVitals.join(', ')}. Regular monitoring helps track your health progress.`
            });
        }

        // Blood pressure insight
        if (overview.bloodPressure && overview.bloodPressure.current) {
            const trend = overview.bloodPressure.trend;
            if (trend === 'stable') {
                insights.push({ type: 'success', message: 'Blood pressure is stable - great job maintaining your health!' });
            } else if (trend === 'improving') {
                insights.push({ type: 'success', message: 'Blood pressure is improving - your treatment plan is working!' });
            } else if (trend === 'declining') {
                insights.push({ type: 'warning', message: 'Blood pressure shows concerning trends - please consult your doctor.' });
            }
        }

        // Heart rate insight
        if (overview.heartRate && overview.heartRate.current) {
            const trend = overview.heartRate.trend;
            if (trend === 'stable') {
                insights.push({ type: 'success', message: 'Heart rate is within normal range.' });
            }
        }

        // Medication compliance insight
        if (metrics?.medications && metrics.medications.length > 0) {
            const avgCompliance = metrics.medications.reduce((sum, m) => sum + (m.compliance || 0), 0) / metrics.medications.length;
            if (avgCompliance >= 90) {
                insights.push({ type: 'success', message: `Excellent medication adherence at ${avgCompliance.toFixed(0)}%!` });
            } else if (avgCompliance >= 75) {
                insights.push({ type: 'info', message: `Good medication adherence at ${avgCompliance.toFixed(0)}%. Try to maintain consistency.` });
            } else {
                insights.push({ type: 'warning', message: `Medication adherence is ${avgCompliance.toFixed(0)}%. Please try to take medications as prescribed.` });
            }
        }

        // Weight trend insight
        if (overview.weight && overview.weight.current) {
            const trend = overview.weight.trend;
            if (trend === 'stable') {
                insights.push({ type: 'info', message: 'Weight is stable.' });
            } else if (trend === 'improving' || trend === 'decreasing') {
                insights.push({ type: 'success', message: 'Weight is trending in a positive direction!' });
            }
        }

        // Lab results insight
        if (metrics?.labResults && metrics.labResults.length > 0) {
            const abnormalLabs = metrics.labResults.filter(lab =>
                lab.status && ['high', 'low', 'borderline'].includes(lab.status.toLowerCase())
            );
            if (abnormalLabs.length === 0) {
                insights.push({ type: 'success', message: 'All recent lab results are within normal range!' });
            } else if (abnormalLabs.length > 0) {
                insights.push({ type: 'warning', message: `${abnormalLabs.length} lab result(s) need attention. Please review with your doctor.` });
            }
        }

        // Recent symptoms insight
        if (metrics?.symptoms && metrics.symptoms.length > 0) {
            const recentSymptoms = metrics.symptoms.slice(0, 3);
            const highSeverity = recentSymptoms.filter(s => s.severity > 4);
            if (highSeverity.length > 0) {
                insights.push({ type: 'danger', message: 'Recent high-severity symptoms reported. Please consult your doctor if symptoms persist.' });
            }
        }

        // Upcoming appointments insight
        if (metrics?.appointments && metrics.appointments.length > 0) {
            const upcomingAppts = metrics.appointments.filter(a =>
                a.date && new Date(a.date) > new Date()
            ).length;
            if (upcomingAppts > 0) {
                insights.push({ type: 'info', message: `You have ${upcomingAppts} upcoming appointment${upcomingAppts > 1 ? 's' : ''}.` });
            }
        }

        return insights.length > 0 ? insights : [
            { type: 'info', message: 'Keep tracking your health metrics regularly for better insights.' }
        ];
    };

    const insights = generateInsights();

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
            {/* Back to Patient List button for doctors/caregivers viewing a specific patient */}
            {showPatientSelector && urlPatientId && (
                <Row className="mb-3">
                    <Col>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigate('/patients')}
                            className="mb-2"
                        >
                            <FontAwesomeIcon icon="arrow-left" className="me-2" />
                            Back to Patient List
                        </Button>
                    </Col>
                </Row>
            )}

            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h2 className="mb-1">
                                <FontAwesomeIcon icon="chart-line" className="me-2 text-primary" />
                                {userRole === 'patient' ? 'Your Health Dashboard' : 'Patient Health Dashboard'}
                            </h2>
                            <p className="text-muted mb-0">
                                {userRole === 'patient'
                                    ? 'Personalized health metrics and tracking'
                                    : currentPatient
                                        ? `Viewing: ${currentPatient.name}${currentPatient.condition ? ` - ${currentPatient.condition}` : ''}`
                                        : 'Select a patient to view metrics'}
                            </p>
                        </div>
                        {showPatientSelector && (
                            <Form.Select
                                value={selectedPatientId || ''}
                                onChange={handlePatientChange}
                                style={{ width: '260px' }}
                            >
                                <option value="">Select a patient...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.condition ? `- ${p.condition}` : ''}
                                    </option>
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
                    const labels = {
                        bloodPressure: 'Blood Pressure', heartRate: 'Heart Rate', weight: 'Weight', bloodSugar: 'Blood Sugar', temperature: 'Temperature'
                    };
                    const icons = {
                        bloodPressure: 'heartbeat', heartRate: 'heart', weight: 'weight', bloodSugar: 'tint', temperature: 'thermometer-half'
                    };
                    const units = {
                        heartRate: 'BPM', weight: 'lbs', temperature: '°F', bloodSugar: 'mg/dL', bloodPressure: ''
                    };

                    // Show empty state if no data
                    if (!item || !item.current) {
                        return (
                            <Col key={key} lg={2} md={4} sm={6} className="mb-3">
                                <Card className="medical-card h-100 bg-light">
                                    <Card.Body className="text-center">
                                        <FontAwesomeIcon icon={icons[key]} size="2x" className="text-muted mb-2 opacity-50" />
                                        <h6 className="text-muted">{labels[key]}</h6>
                                        <h4 className="text-muted">--</h4>
                                        <div className="small text-muted">
                                            <FontAwesomeIcon icon="exclamation-circle" className="me-1" />
                                            No data
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    }

                    const trend = mapTrendLabel(item.trend);
                    return (
                        <Col key={key} lg={2} md={4} sm={6} className="mb-3">
                            <Card className="medical-card h-100">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon={icons[key]} size="2x" className="text-primary mb-2" />
                                    <h6>{labels[key]}</h6>
                                    <h4 className="text-primary">
                                        {item.current}
                                        {units[key] && <span className="small ms-1">{units[key]}</span>}
                                    </h4>
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
                                        {!metrics?.vitals || metrics.vitals.length === 0 ? (
                                            <div className="text-center py-5 text-muted">
                                                <FontAwesomeIcon icon="chart-line" size="3x" className="mb-3 opacity-50" />
                                                <p className="mb-1">No vital signs data available</p>
                                                <small>Vital signs will appear here once recorded</small>
                                            </div>
                                        ) : (
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
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="medications">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="mb-0">Medications</h6>
                                            {userRole === 'doctor' && (
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => {
                                                        setShowMedicationModal(true);
                                                        setMedicationError('');
                                                        setMedicationSuccess('');
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="plus" className="me-1" />
                                                    Add Medication
                                                </Button>
                                            )}
                                        </div>
                                        {!metrics?.medications || metrics.medications.length === 0 ? (
                                            <div className="text-center py-5 text-muted">
                                                <FontAwesomeIcon icon="pills" size="3x" className="mb-3 opacity-50" />
                                                <p>No medications recorded</p>
                                                {userRole === 'doctor' && (
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => setShowMedicationModal(true)}
                                                    >
                                                        <FontAwesomeIcon icon="plus" className="me-1" />
                                                        Prescribe First Medication
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <Table responsive>
                                                <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Compliance</th><th>Next Due</th></tr></thead>
                                                <tbody>
                                                    {metrics.medications.map((m, i) => (
                                                        <tr key={i}>
                                                            <td><strong>{m.name || '—'}</strong></td>
                                                            <td>{m.dosage || '—'}</td>
                                                            <td>{m.frequency || '—'}</td>
                                                            <td>
                                                                {m.compliance !== undefined && m.compliance !== null ? (
                                                                    <>
                                                                        <div className="mb-1">
                                                                            <ProgressBar
                                                                                now={m.compliance}
                                                                                variant={m.compliance >= 90 ? 'success' : m.compliance >= 80 ? 'warning' : 'danger'}
                                                                                style={{ height: '8px' }}
                                                                            />
                                                                        </div>
                                                                        <small>{m.compliance}%</small>
                                                                    </>
                                                                ) : '—'}
                                                            </td>
                                                            <td>
                                                                {m.nextDue ? (
                                                                    new Date(m.nextDue).toLocaleDateString()
                                                                ) : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="labs">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="mb-0">Lab Results</h6>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => {
                                                    setShowLabModal(true);
                                                    setLabError('');
                                                    setLabSuccess('');
                                                }}
                                            >
                                                <FontAwesomeIcon icon="plus" className="me-1" />
                                                Add Lab Result
                                            </Button>
                                        </div>
                                        {!metrics?.labResults || metrics.labResults.length === 0 ? (
                                            <div className="text-center py-5 text-muted">
                                                <FontAwesomeIcon icon="flask" size="3x" className="mb-3 opacity-50" />
                                                <p>No lab results available</p>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => setShowLabModal(true)}
                                                >
                                                    <FontAwesomeIcon icon="plus" className="me-1" />
                                                    Add Your First Lab Result
                                                </Button>
                                            </div>
                                        ) : (
                                            <Table responsive>
                                                <thead><tr><th>Test</th><th>Value</th><th>Range</th><th>Status</th><th>Date</th></tr></thead>
                                                <tbody>
                                                    {metrics.labResults.map((r, i) => (
                                                        <tr key={i}>
                                                            <td><strong>{r.test || '—'}</strong></td>
                                                            <td>{r.value || '—'}</td>
                                                            <td>{r.range || '—'}</td>
                                                            <td>
                                                                {r.status ? (
                                                                    <Badge bg={
                                                                        r.status === 'normal' ? 'success' :
                                                                            r.status === 'good' ? 'primary' :
                                                                                r.status === 'borderline' ? 'warning' :
                                                                                    r.status === 'high' ? 'danger' :
                                                                                        'secondary'
                                                                    }>
                                                                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                                                    </Badge>
                                                                ) : '—'}
                                                            </td>
                                                            <td>
                                                                {r.date ? (
                                                                    new Date(r.date).toLocaleDateString()
                                                                ) : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="symptoms">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="mb-0">Symptoms Log</h6>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => {
                                                    setShowSymptomModal(true);
                                                    setSymptomError('');
                                                    setSymptomSuccess('');
                                                }}
                                            >
                                                <FontAwesomeIcon icon="plus" className="me-1" />
                                                Record Symptom
                                            </Button>
                                        </div>
                                        {!metrics?.symptoms || metrics.symptoms.length === 0 ? (
                                            <div className="text-center py-5 text-muted">
                                                <FontAwesomeIcon icon="notes-medical" size="3x" className="mb-3 opacity-50" />
                                                <p>No symptoms recorded</p>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => setShowSymptomModal(true)}
                                                >
                                                    <FontAwesomeIcon icon="plus" className="me-1" />
                                                    Record Your First Symptom
                                                </Button>
                                            </div>
                                        ) : (
                                            metrics.symptoms.map((s, i) => (
                                                <Card key={i} className="mb-3">
                                                    <Card.Body>
                                                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                                            <div className="flex-grow-1">
                                                                <h6 className="mb-2">
                                                                    {s.symptom || 'Unspecified symptom'}
                                                                    {s.severity !== undefined && s.severity !== null && (
                                                                        <Badge
                                                                            bg={s.severity <= 2 ? 'success' : s.severity <= 4 ? 'warning' : 'danger'}
                                                                            className="ms-2"
                                                                        >
                                                                            Severity {s.severity}
                                                                        </Badge>
                                                                    )}
                                                                </h6>
                                                                {s.duration && (
                                                                    <p className="mb-1 small text-muted">
                                                                        <FontAwesomeIcon icon="clock" className="me-1" />
                                                                        Duration: {s.duration}
                                                                    </p>
                                                                )}
                                                                {s.notes && <p className="mb-0">{s.notes}</p>}
                                                            </div>
                                                            <div className="text-muted small text-nowrap">
                                                                <FontAwesomeIcon icon="calendar" className="me-1" />
                                                                {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                                                            </div>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            ))
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="appointments">
                                        {!metrics?.appointments || metrics.appointments.length === 0 ? (
                                            <div className="text-center py-5 text-muted">
                                                <FontAwesomeIcon icon="calendar" size="3x" className="mb-3 opacity-50" />
                                                <p>No appointments scheduled</p>
                                            </div>
                                        ) : (
                                            <Table responsive>
                                                <thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Notes</th></tr></thead>
                                                <tbody>
                                                    {metrics.appointments.map((a, i) => (
                                                        <tr key={i}>
                                                            <td>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                                                            <td>{a.doctor || '—'}</td>
                                                            <td>{a.type ? <Badge bg="primary">{a.type}</Badge> : '—'}</td>
                                                            <td>{a.notes || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        )}
                                    </Tab.Pane>
                                    {showPatientSelector && (
                                        <Tab.Pane eventKey="patients">
                                            <h6 className="mb-3">Patient List</h6>
                                            <Table responsive hover>
                                                <thead><tr><th>Name</th><th>Condition</th><th></th></tr></thead>
                                                <tbody>
                                                    {patients.map(p => (
                                                        <tr key={p.id} className={parseInt(selectedPatientId) === p.id ? 'table-active' : ''}>
                                                            <td>{p.name}</td>
                                                            <td>{p.condition || '—'}</td>
                                                            <td>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline-primary"
                                                                    onClick={() => navigate(`/health-dashboard?patientId=${p.id}`)}
                                                                >
                                                                    View
                                                                </Button>
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

            {/* Dynamic Insights */}
            <Row className="mt-4">
                <Col>
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="lightbulb" className="me-2" />
                            Health Insights
                        </Card.Header>
                        <Card.Body>
                            {insights.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <FontAwesomeIcon icon="lightbulb" size="2x" className="mb-3 opacity-50" />
                                    <p>No insights available. Continue tracking your health for personalized recommendations.</p>
                                </div>
                            ) : (
                                insights.map((insight, idx) => (
                                    <Alert
                                        key={idx}
                                        variant={insight.type}
                                        className={idx === insights.length - 1 ? 'mb-0' : 'mb-2'}
                                    >
                                        <FontAwesomeIcon
                                            icon={
                                                insight.type === 'success' ? 'check-circle' :
                                                    insight.type === 'warning' ? 'exclamation-triangle' :
                                                        insight.type === 'danger' ? 'exclamation-circle' :
                                                            'info-circle'
                                            }
                                            className="me-2"
                                        />
                                        {insight.message}
                                    </Alert>
                                ))
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Lab Result Upload Modal */}
            <Modal show={showLabModal} onHide={() => setShowLabModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="flask" className="me-2" />
                        Add Lab Result
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleLabSubmit}>
                    <Modal.Body>
                        {labError && <Alert variant="danger">{labError}</Alert>}
                        {labSuccess && <Alert variant="success">{labSuccess}</Alert>}

                        <Alert variant="info" className="mb-3">
                            <FontAwesomeIcon icon="info-circle" className="me-2" />
                            Upload lab results as PDF, image, or document files (max 10MB)
                        </Alert>

                        <Form.Group className="mb-3" controlId="labFile">
                            <Form.Label>Select Lab Result File <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        if (file.size > 10 * 1024 * 1024) {
                                            setLabError('File size must be less than 10MB');
                                            setLabFile(null);
                                            e.target.value = '';
                                        } else {
                                            setLabError('');
                                            setLabFile(file);
                                        }
                                    }
                                }}
                                required
                            />
                            <Form.Text className="text-muted">
                                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                            </Form.Text>
                        </Form.Group>

                        {labFile && (
                            <Alert variant="success" className="mb-3">
                                <FontAwesomeIcon icon="file" className="me-2" />
                                Selected file: <strong>{labFile.name}</strong> ({(labFile.size / 1024).toFixed(2)} KB)
                            </Alert>
                        )}

                        <Form.Group className="mb-3" controlId="labNotes">
                            <Form.Label>Additional Notes (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Add any notes about this lab result..."
                            />
                            <Form.Text className="text-muted">
                                You can add context or observations about the lab results
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => { setShowLabModal(false); setLabFile(null); setLabError(''); }} disabled={labLoading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={labLoading || !labFile}>
                            {labLoading ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon="upload" className="me-2" />
                                    Upload Lab Result
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Symptom/Diagnosis Recording Modal */}
            <Modal show={showSymptomModal} onHide={() => setShowSymptomModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="notes-medical" className="me-2" />
                        Record Patient Diagnosis & Symptoms
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSymptomSubmit}>
                    <Modal.Body>
                        {symptomError && <Alert variant="danger">{symptomError}</Alert>}
                        {symptomSuccess && <Alert variant="success">{symptomSuccess}</Alert>}

                        <Alert variant="info" className="mb-3">
                            <FontAwesomeIcon icon="user-md" className="me-2" />
                            Recording medical observations and diagnosis for patient
                        </Alert>

                        <Form.Group className="mb-3" controlId="diagnosis">
                            <Form.Label>Diagnosis <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Hypertension, Type 2 Diabetes, Seasonal Allergies"
                                value={symptomFormData.diagnosis}
                                onChange={(e) => setSymptomFormData({ ...symptomFormData, diagnosis: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="symptoms">
                            <Form.Label>Presenting Symptoms <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Describe the patient's symptoms..."
                                value={symptomFormData.symptoms}
                                onChange={(e) => setSymptomFormData({ ...symptomFormData, symptoms: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="severity">
                                    <Form.Label>Severity <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={symptomFormData.severity}
                                        onChange={(e) => setSymptomFormData({ ...symptomFormData, severity: e.target.value })}
                                        required
                                    >
                                        <option value="mild">Mild</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="severe">Severe</option>
                                        <option value="critical">Critical</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="onsetDate">
                                    <Form.Label>Onset Date <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={symptomFormData.onset_date}
                                        onChange={(e) => setSymptomFormData({ ...symptomFormData, onset_date: e.target.value })}
                                        max={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3" controlId="prescribedTreatment">
                            <Form.Label>Prescribed Treatment</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Medications, procedures, or recommendations..."
                                value={symptomFormData.prescribed_treatment}
                                onChange={(e) => setSymptomFormData({ ...symptomFormData, prescribed_treatment: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="clinicalNotes">
                            <Form.Label>Clinical Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Additional clinical observations, test results, follow-up instructions..."
                                value={symptomFormData.notes}
                                onChange={(e) => setSymptomFormData({ ...symptomFormData, notes: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowSymptomModal(false)} disabled={symptomLoading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={symptomLoading}>
                            {symptomLoading ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon="save" className="me-2" />
                                    Save Diagnosis & Symptoms
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Medication/Prescription Modal */}
            <Modal show={showMedicationModal} onHide={() => setShowMedicationModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="pills" className="me-2" />
                        Prescribe Medication
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleMedicationSubmit}>
                    <Modal.Body>
                        {medicationError && <Alert variant="danger">{medicationError}</Alert>}
                        {medicationSuccess && <Alert variant="success">{medicationSuccess}</Alert>}

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <FontAwesomeIcon icon="pills" className="me-2" />
                                Medication Name <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Lisinopril, Metformin, Aspirin"
                                required
                                value={medicationFormData.name}
                                onChange={(e) => setMedicationFormData({ ...medicationFormData, name: e.target.value })}
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="prescription" className="me-2" />
                                        Dosage <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g., 10mg, 500mg, 1 tablet"
                                        required
                                        value={medicationFormData.dosage}
                                        onChange={(e) => setMedicationFormData({ ...medicationFormData, dosage: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        Specify the amount per dose
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="clock" className="me-2" />
                                        Frequency <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g., Once daily, Twice daily, Every 8 hours"
                                        required
                                        value={medicationFormData.frequency}
                                        onChange={(e) => setMedicationFormData({ ...medicationFormData, frequency: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        How often to take the medication
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Next Due Date
                            </Form.Label>
                            <Form.Control
                                type="date"
                                value={medicationFormData.next_due}
                                onChange={(e) => setMedicationFormData({ ...medicationFormData, next_due: e.target.value })}
                            />
                            <Form.Text className="text-muted">
                                When should the patient take the next dose
                            </Form.Text>
                        </Form.Group>

                        <Alert variant="info" className="mb-0">
                            <FontAwesomeIcon icon="info-circle" className="me-2" />
                            <small>
                                This prescription will be added to the patient's medication list and visible in their health dashboard.
                            </small>
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowMedicationModal(false)} disabled={medicationLoading}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={medicationLoading}>
                            {medicationLoading ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Prescribing...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon="check" className="me-2" />
                                    Prescribe Medication
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default PatientHealthDashboard;
