import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Nav, Tab, Alert, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

/**
 * SharedHealthDashboard Component
 * 
 * A shared dashboard component that can be used to display health data for a patient.
 * It is designed to be used by different roles (patient, doctor, caregiver) with varying levels of access.
 * 
 * Note: This component seems to use mock data and might be a legacy or alternative view 
 * compared to PatientHealthDashboard.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.userRole='patient'] - The role of the current user
 * @param {number|string} [props.patientId=null] - The ID of the patient to display (if applicable)
 */
const SharedHealthDashboard = ({ userRole = 'patient', patientId = null }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [accessGranted, setAccessGranted] = useState(true);

    // Mock health data
    const [healthData, setHealthData] = useState({
        overview: {
            bloodPressure: { current: '120/80', trend: 'stable', lastReading: '2024-01-15' },
            heartRate: { current: 72, trend: 'normal', lastReading: '2024-01-15' },
            weight: { current: 150, trend: 'decreasing', lastReading: '2024-01-14' },
            bloodSugar: { current: 95, trend: 'stable', lastReading: '2024-01-15' },
            temperature: { current: 98.6, trend: 'normal', lastReading: '2024-01-15' }
        },
        vitals: [
            { date: '2024-01-10', bloodPressure: 125, heartRate: 75, weight: 152, bloodSugar: 98 },
            { date: '2024-01-11', bloodPressure: 122, heartRate: 73, weight: 151.5, bloodSugar: 92 },
            { date: '2024-01-12', bloodPressure: 120, heartRate: 71, weight: 151, bloodSugar: 96 },
            { date: '2024-01-13', bloodPressure: 118, heartRate: 70, weight: 150.5, bloodSugar: 94 },
            { date: '2024-01-14', bloodPressure: 121, heartRate: 72, weight: 150, bloodSugar: 95 },
            { date: '2024-01-15', bloodPressure: 120, heartRate: 72, weight: 150, bloodSugar: 95 }
        ],
        medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', compliance: 95, nextDue: '2024-01-16' },
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', compliance: 88, nextDue: '2024-01-15' },
            { name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily', compliance: 92, nextDue: '2024-01-16' }
        ],
        labResults: [
            { test: 'Hemoglobin A1C', value: '6.2%', range: '<7%', status: 'normal', date: '2024-01-10' },
            { test: 'Total Cholesterol', value: '185 mg/dL', range: '<200 mg/dL', status: 'normal', date: '2024-01-10' },
            { test: 'HDL Cholesterol', value: '58 mg/dL', range: '>40 mg/dL', status: 'good', date: '2024-01-10' },
            { test: 'LDL Cholesterol', value: '110 mg/dL', range: '<100 mg/dL', status: 'borderline', date: '2024-01-10' },
            { test: 'Triglycerides', value: '135 mg/dL', range: '<150 mg/dL', status: 'normal', date: '2024-01-10' }
        ],
        symptoms: [
            { date: '2024-01-15', symptom: 'Mild headache', severity: 2, duration: '2 hours', notes: 'Resolved with rest' },
            { date: '2024-01-13', symptom: 'Fatigue', severity: 3, duration: 'All day', notes: 'Better after medication adjustment' },
            { date: '2024-01-12', symptom: 'Dizziness', severity: 2, duration: '30 minutes', notes: 'After standing up quickly' }
        ],
        appointments: [
            { date: '2024-01-20', doctor: 'Dr. Smith', type: 'Follow-up', notes: 'Blood pressure check' },
            { date: '2024-01-25', doctor: 'Dr. Johnson', type: 'Lab Review', notes: 'Discuss cholesterol results' },
            { date: '2024-02-01', doctor: 'Dr. Wilson', type: 'Routine Check', notes: 'Annual physical exam' }
        ]
    });

    // Mock patients for doctor/caregiver view
    const [patients, setPatients] = useState([
        { id: 1, name: 'John Smith', age: 45, condition: 'Hypertension', lastVisit: '2024-01-15' },
        { id: 2, name: 'Mary Johnson', age: 62, condition: 'Diabetes Type 2', lastVisit: '2024-01-14' },
        { id: 3, name: 'Robert Wilson', age: 38, condition: 'High Cholesterol', lastVisit: '2024-01-13' }
    ]);

    const canViewData = (dataType) => {
        switch (userRole) {
            case 'patient':
                return true; // Patients can view all their own data
            case 'doctor':
                return true; // Doctors have full access to patient data
            case 'caregiver':
                // Caregivers have limited access based on care plan
                return ['overview', 'vitals', 'medications', 'symptoms'].includes(dataType);
            default:
                return false;
        }
    };

    const getVitalTrend = (trend) => {
        switch (trend) {
            case 'improving':
                return { icon: 'arrow-up', color: 'success', text: 'Improving' };
            case 'stable':
                return { icon: 'minus', color: 'primary', text: 'Stable' };
            case 'declining':
                return { icon: 'arrow-down', color: 'danger', text: 'Declining' };
            case 'normal':
                return { icon: 'check', color: 'success', text: 'Normal' };
            default:
                return { icon: 'question', color: 'secondary', text: 'Unknown' };
        }
    };

    const getLabStatus = (status) => {
        switch (status) {
            case 'normal':
                return <Badge bg="success">Normal</Badge>;
            case 'good':
                return <Badge bg="primary">Good</Badge>;
            case 'borderline':
                return <Badge bg="warning">Borderline</Badge>;
            case 'high':
                return <Badge bg="danger">High</Badge>;
            case 'low':
                return <Badge bg="info">Low</Badge>;
            default:
                return <Badge bg="secondary">Unknown</Badge>;
        }
    };

    const getSeverityColor = (severity) => {
        if (severity <= 2) return 'success';
        if (severity <= 4) return 'warning';
        return 'danger';
    };

    const pieChartData = [
        { name: 'Normal', value: 3, color: '#28a745' },
        { name: 'Borderline', value: 1, color: '#ffc107' },
        { name: 'Good', value: 1, color: '#007bff' }
    ];

    if (!accessGranted) {
        return (
            <Container fluid className="fade-in">
                <Row className="justify-content-center">
                    <Col md={6}>
                        <Alert variant="warning" className="text-center">
                            <FontAwesomeIcon icon="lock" size="3x" className="mb-3" />
                            <h4>Access Restricted</h4>
                            <p>You don't have permission to view this patient's health data.</p>
                        </Alert>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <FontAwesomeIcon icon="chart-line" className="me-2 text-primary" />
                                Health Dashboard
                                {userRole !== 'patient' && (
                                    <Badge bg="info" className="ms-2">{userRole.charAt(0).toUpperCase() + userRole.slice(1)} View</Badge>
                                )}
                            </h2>
                            <p className="text-muted">
                                {userRole === 'patient' ? 'Your health data and medical records' : 'Patient health monitoring and analytics'}
                            </p>
                        </div>

                        {userRole !== 'patient' && (
                            <div>
                                <Form.Select
                                    value={selectedPatient?.id || ''}
                                    onChange={(e) => {
                                        const patient = patients.find(p => p.id === parseInt(e.target.value));
                                        setSelectedPatient(patient);
                                    }}
                                    style={{ width: '250px' }}
                                >
                                    <option value="">Select Patient</option>
                                    {patients.map(patient => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name} - {patient.condition}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Health Overview Cards */}
            {canViewData('overview') && (
                <Row className="mb-4">
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="heartbeat" size="2x" className="text-danger mb-2" />
                                <h6>Blood Pressure</h6>
                                <h4 className="text-primary">{healthData.overview.bloodPressure.current}</h4>
                                <div className="small">
                                    <FontAwesomeIcon
                                        icon={getVitalTrend(healthData.overview.bloodPressure.trend).icon}
                                        className={`text-${getVitalTrend(healthData.overview.bloodPressure.trend).color} me-1`}
                                    />
                                    {getVitalTrend(healthData.overview.bloodPressure.trend).text}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="heart" size="2x" className="text-success mb-2" />
                                <h6>Heart Rate</h6>
                                <h4 className="text-primary">{healthData.overview.heartRate.current} BPM</h4>
                                <div className="small">
                                    <FontAwesomeIcon
                                        icon={getVitalTrend(healthData.overview.heartRate.trend).icon}
                                        className={`text-${getVitalTrend(healthData.overview.heartRate.trend).color} me-1`}
                                    />
                                    {getVitalTrend(healthData.overview.heartRate.trend).text}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="weight" size="2x" className="text-info mb-2" />
                                <h6>Weight</h6>
                                <h4 className="text-primary">{healthData.overview.weight.current} lbs</h4>
                                <div className="small">
                                    <FontAwesomeIcon
                                        icon={getVitalTrend(healthData.overview.weight.trend).icon}
                                        className={`text-${getVitalTrend(healthData.overview.weight.trend).color} me-1`}
                                    />
                                    {getVitalTrend(healthData.overview.weight.trend).text}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="tint" size="2x" className="text-warning mb-2" />
                                <h6>Blood Sugar</h6>
                                <h4 className="text-primary">{healthData.overview.bloodSugar.current} mg/dL</h4>
                                <div className="small">
                                    <FontAwesomeIcon
                                        icon={getVitalTrend(healthData.overview.bloodSugar.trend).icon}
                                        className={`text-${getVitalTrend(healthData.overview.bloodSugar.trend).color} me-1`}
                                    />
                                    {getVitalTrend(healthData.overview.bloodSugar.trend).text}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="thermometer-half" size="2x" className="text-danger mb-2" />
                                <h6>Temperature</h6>
                                <h4 className="text-primary">{healthData.overview.temperature.current}°F</h4>
                                <div className="small">
                                    <FontAwesomeIcon
                                        icon={getVitalTrend(healthData.overview.temperature.trend).icon}
                                        className={`text-${getVitalTrend(healthData.overview.temperature.trend).color} me-1`}
                                    />
                                    {getVitalTrend(healthData.overview.temperature.trend).text}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={2} md={4} sm={6} className="mb-3">
                        <Card className="medical-card h-100">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon="pills" size="2x" className="text-primary mb-2" />
                                <h6>Medications</h6>
                                <h4 className="text-primary">{healthData.medications.length}</h4>
                                <div className="small">
                                    <FontAwesomeIcon icon="check" className="text-success me-1" />
                                    Active
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Detailed Health Data Tabs */}
            <Row>
                <Col>
                    <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                        <Card className="medical-card">
                            <Card.Header>
                                <Nav variant="tabs">
                                    {canViewData('vitals') && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="vitals">
                                                <FontAwesomeIcon icon="chart-line" className="me-1" />
                                                Vitals Trends
                                            </Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {canViewData('medications') && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="medications">
                                                <FontAwesomeIcon icon="pills" className="me-1" />
                                                Medications
                                            </Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {canViewData('labResults') && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="labResults">
                                                <FontAwesomeIcon icon="flask" className="me-1" />
                                                Lab Results
                                            </Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {canViewData('symptoms') && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="symptoms">
                                                <FontAwesomeIcon icon="notes-medical" className="me-1" />
                                                Symptoms
                                            </Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {canViewData('appointments') && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="appointments">
                                                <FontAwesomeIcon icon="calendar" className="me-1" />
                                                Appointments
                                            </Nav.Link>
                                        </Nav.Item>
                                    )}
                                </Nav>
                            </Card.Header>

                            <Card.Body>
                                <Tab.Content>
                                    {/* Vitals Trends Tab */}
                                    <Tab.Pane eventKey="vitals">
                                        <Row>
                                            <Col lg={8}>
                                                <h5 className="mb-3">Blood Pressure Trend</h5>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <LineChart data={healthData.vitals}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="bloodPressure"
                                                            stroke="#007bff"
                                                            strokeWidth={3}
                                                            name="Blood Pressure"
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </Col>
                                            <Col lg={4}>
                                                <h5 className="mb-3">Heart Rate Trend</h5>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={healthData.vitals}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Bar dataKey="heartRate" fill="#28a745" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>

                                    {/* Medications Tab */}
                                    <Tab.Pane eventKey="medications">
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Medication</th>
                                                    <th>Dosage</th>
                                                    <th>Frequency</th>
                                                    <th>Compliance</th>
                                                    <th>Next Due</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {healthData.medications.map((med, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <strong>{med.name}</strong>
                                                        </td>
                                                        <td>{med.dosage}</td>
                                                        <td>{med.frequency}</td>
                                                        <td>
                                                            <div className="mb-1">
                                                                <ProgressBar
                                                                    now={med.compliance}
                                                                    variant={med.compliance >= 90 ? 'success' : med.compliance >= 80 ? 'warning' : 'danger'}
                                                                    style={{ height: '8px' }}
                                                                />
                                                            </div>
                                                            <small>{med.compliance}%</small>
                                                        </td>
                                                        <td>{new Date(med.nextDue).toLocaleDateString()}</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary" className="me-1">
                                                                <FontAwesomeIcon icon="eye" />
                                                            </Button>
                                                            {userRole === 'doctor' && (
                                                                <Button size="sm" variant="outline-secondary">
                                                                    <FontAwesomeIcon icon="edit" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Tab.Pane>

                                    {/* Lab Results Tab */}
                                    <Tab.Pane eventKey="labResults">
                                        <Row className="mb-3">
                                            <Col lg={8}>
                                                <Table responsive>
                                                    <thead>
                                                        <tr>
                                                            <th>Test</th>
                                                            <th>Value</th>
                                                            <th>Normal Range</th>
                                                            <th>Status</th>
                                                            <th>Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {healthData.labResults.map((result, index) => (
                                                            <tr key={index}>
                                                                <td><strong>{result.test}</strong></td>
                                                                <td>{result.value}</td>
                                                                <td>{result.range}</td>
                                                                <td>{getLabStatus(result.status)}</td>
                                                                <td>{new Date(result.date).toLocaleDateString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </Col>
                                            <Col lg={4}>
                                                <h6 className="mb-3">Lab Results Summary</h6>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={80}
                                                            dataKey="value"
                                                            label
                                                        >
                                                            {pieChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>

                                    {/* Symptoms Tab */}
                                    <Tab.Pane eventKey="symptoms">
                                        <div>
                                            {healthData.symptoms.map((symptom, index) => (
                                                <Card key={index} className="mb-3">
                                                    <Card.Body>
                                                        <Row>
                                                            <Col md={8}>
                                                                <div className="d-flex align-items-center mb-2">
                                                                    <h6 className="mb-0 me-2">{symptom.symptom}</h6>
                                                                    <Badge bg={getSeverityColor(symptom.severity)}>
                                                                        Severity: {symptom.severity}/5
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-muted mb-1">
                                                                    <FontAwesomeIcon icon="clock" className="me-1" />
                                                                    Duration: {symptom.duration}
                                                                </p>
                                                                <p className="mb-0">{symptom.notes}</p>
                                                            </Col>
                                                            <Col md={4} className="text-end">
                                                                <div className="text-muted">
                                                                    <FontAwesomeIcon icon="calendar" className="me-1" />
                                                                    {new Date(symptom.date).toLocaleDateString()}
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </Card.Body>
                                                </Card>
                                            ))}
                                        </div>
                                    </Tab.Pane>

                                    {/* Appointments Tab */}
                                    <Tab.Pane eventKey="appointments">
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Doctor</th>
                                                    <th>Type</th>
                                                    <th>Notes</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {healthData.appointments.map((appointment, index) => (
                                                    <tr key={index}>
                                                        <td>{new Date(appointment.date).toLocaleDateString()}</td>
                                                        <td>{appointment.doctor}</td>
                                                        <td>
                                                            <Badge bg="primary">{appointment.type}</Badge>
                                                        </td>
                                                        <td>{appointment.notes}</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary" className="me-1">
                                                                <FontAwesomeIcon icon="eye" />
                                                            </Button>
                                                            {userRole !== 'caregiver' && (
                                                                <Button size="sm" variant="outline-secondary">
                                                                    <FontAwesomeIcon icon="edit" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Card.Body>
                        </Card>
                    </Tab.Container>
                </Col>
            </Row>

            {/* Health Insights */}
            {canViewData('insights') && (
                <Row className="mt-4">
                    <Col>
                        <Card className="medical-card">
                            <Card.Header>
                                <FontAwesomeIcon icon="lightbulb" className="me-2" />
                                Health Insights & Recommendations
                            </Card.Header>
                            <Card.Body>
                                <Alert variant="info">
                                    <FontAwesomeIcon icon="info-circle" className="me-2" />
                                    <strong>Blood Pressure:</strong> Your readings have been stable. Continue your current medication regimen.
                                </Alert>
                                <Alert variant="success">
                                    <FontAwesomeIcon icon="check-circle" className="me-2" />
                                    <strong>Medication Compliance:</strong> Excellent adherence to medication schedule. Keep up the good work!
                                </Alert>
                                <Alert variant="warning">
                                    <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                    <strong>LDL Cholesterol:</strong> Slightly elevated. Consider dietary modifications and discuss with your doctor.
                                </Alert>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default SharedHealthDashboard;