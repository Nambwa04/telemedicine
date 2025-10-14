import React, { useState, useEffect } from 'react';
import { Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { getStatusMeta } from '../../utils/statusStyles';
import { fetchPatientList } from '../../services/healthService';
import { createPrescription } from '../../services/prescriptionService';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../config';
import { useCallback } from 'react';
import { listDoctorRequests, acceptDoctorRequest, declineDoctorRequest } from '../../services/doctorService';

const DoctorDashboard = () => {
    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Fetch dashboard stats from backend
    const [stats, setStats] = useState({
        todayAppointments: 0,
        totalPatients: 0,
        pendingConsults: 0,
        completedToday: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const { user } = useAuth();
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            // Try to get token from user context or localStorage
            let token = null;
            if (user && user.access) {
                token = user.access;
            } else if (localStorage.getItem('access')) {
                token = localStorage.getItem('access');
            }
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_BASE}/accounts/dashboard-stats/`, {
                headers
            });
            if (!res.ok) throw new Error('Failed to fetch dashboard stats');
            const data = await res.json();
            setStats({
                todayAppointments: data.todayAppointments || 0,
                totalPatients: data.totalPatients || 0,
                pendingConsults: data.pendingConsults || 0,
                completedToday: data.completedToday || 0
            });
        } catch (e) {
            setStatsError(e.message || 'Failed to load stats');
        } finally {
            setStatsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);
    const navigate = useNavigate();
    // State for add patient modal (all hooks must be at top level)
    // Removed unused add patient modal state and newPatient state

    // Update patient modal state
    const [showUpdatePatient, setShowUpdatePatient] = useState(false);
    const [updatePatientLoading, setUpdatePatientLoading] = useState(false);
    const [updatePatientError, setUpdatePatientError] = useState(null);
    const [updatePatientSuccess, setUpdatePatientSuccess] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [updatedPatientData, setUpdatedPatientData] = useState({
        first_name: '',
        last_name: '',
        primary_condition: ''
    });

    // Prescription modal state
    const [showPrescription, setShowPrescription] = useState(false);
    const [prescriptionLoading, setPrescriptionLoading] = useState(false);
    const [prescriptionError, setPrescriptionError] = useState(null);
    const [prescriptionSuccess, setPrescriptionSuccess] = useState(null);
    const [prescription, setPrescription] = useState({
        patient: '',
        name: '',
        dosage: '',
        frequency: '',
        next_due: ''
    });

    // Add Patient modal state
    const [showAddPatient, setShowAddPatient] = useState(false);
    const [addPatientLoading, setAddPatientLoading] = useState(false);
    const [addPatientError, setAddPatientError] = useState(null);
    const [addPatientSuccess, setAddPatientSuccess] = useState(null);
    const [newPatient, setNewPatient] = useState({
        email: '',
        first_name: '',
        last_name: ''
    });

    // Removed unused add patient handler and related state

    // State for today's schedule
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);

    // Fetch today's schedule from backend
    const fetchSchedule = useCallback(async () => {
        setScheduleLoading(true);
        setScheduleError(null);
        try {
            let token = null;
            if (user && user.access) {
                token = user.access;
            } else if (localStorage.getItem('access')) {
                token = localStorage.getItem('access');
            }
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            // Adjust the endpoint as needed to match your backend
            const res = await fetch(`${API_BASE}/appointments/today/`, { headers });
            if (!res.ok) throw new Error('Failed to fetch today\'s schedule');
            const data = await res.json();
            setTodaySchedule(Array.isArray(data) ? data : []);
        } catch (e) {
            setScheduleError(e.message || 'Failed to load today\'s schedule');
        } finally {
            setScheduleLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const [pendingTasks] = useState([
        { id: 1, task: 'Review test results for John Baraza', priority: 'high', type: 'review' },
        { id: 2, task: 'Prescribe medication for Sarah Wangeci', priority: 'medium', type: 'prescription' },
        { id: 3, task: 'Update treatment plan for Mike Otieno', priority: 'low', type: 'update' }
    ]);

    const [recentPatients, setRecentPatients] = useState([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientsError, setPatientsError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setPatientsLoading(true);
            setPatientsError(null);
            try {
                const list = await fetchPatientList();
                if (mounted) setRecentPatients(list);
            } catch (e) {
                if (mounted) setPatientsError('Failed to load patients');
            } finally {
                if (mounted) setPatientsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Doctor assignment requests state
    const [doctorRequests, setDoctorRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [requestsError, setRequestsError] = useState(null);

    // Fetch pending doctor assignment requests
    const fetchDoctorRequests = useCallback(async () => {
        setRequestsLoading(true);
        setRequestsError(null);
        try {
            const data = await listDoctorRequests({ status: 'new', ordering: '-created_at' });
            setDoctorRequests(data);
        } catch (error) {
            console.error('Failed to fetch doctor requests:', error);
            setRequestsError('Failed to load assignment requests');
        } finally {
            setRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDoctorRequests();
    }, [fetchDoctorRequests]);

    // Handle accepting a doctor request
    const handleAcceptRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to accept this patient assignment?')) {
            return;
        }

        const result = await acceptDoctorRequest(requestId);
        if (result.success) {
            alert('Patient assignment accepted successfully!');
            fetchDoctorRequests(); // Refresh the list
            fetchStats(); // Refresh stats
        } else {
            alert(`Failed to accept request: ${result.error}`);
        }
    };

    // Handle declining a doctor request
    const handleDeclineRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to decline this patient assignment?')) {
            return;
        }

        const result = await declineDoctorRequest(requestId);
        if (result.success) {
            alert('Patient assignment declined.');
            fetchDoctorRequests(); // Refresh the list
        } else {
            alert(`Failed to decline request: ${result.error}`);
        }
    };


    const priorityMeta = {
        high: { label: 'High', badgeClass: 'badge-soft-danger' },
        medium: { label: 'Medium', badgeClass: 'badge-soft-warning' },
        low: { label: 'Low', badgeClass: 'badge-soft-success' }
    };

    // Action handlers
    const handleViewPatient = (patient) => {
        // Navigate to patient details page or show modal
        if (navigate) navigate(`/patients/${patient.id}`);
        else alert(`View patient: ${patient.name}`);
    };

    // Handle edit patient - open modal with patient data
    const handleEditPatient = (patient) => {
        setSelectedPatient(patient);
        setUpdatedPatientData({
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            primary_condition: patient.condition || patient.primary_condition || ''
        });
        setUpdatePatientError(null);
        setUpdatePatientSuccess(null);
        setShowUpdatePatient(true);
    };

    // Handle update patient submission
    const handleUpdatePatientSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setUpdatePatientLoading(true);
        setUpdatePatientError(null);
        setUpdatePatientSuccess(null);

        try {
            let token = null;
            if (user && user.access) {
                token = user.access;
            } else if (localStorage.getItem('access')) {
                token = localStorage.getItem('access');
            }

            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE}/accounts/doctor/patients/${selectedPatient.id}/update/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updatedPatientData)
            });

            if (!res.ok) {
                let msg = 'Failed to update patient';
                try {
                    const errData = await res.json();
                    if (errData.detail) {
                        msg = errData.detail;
                    } else if (typeof errData === 'object') {
                        msg = Object.entries(errData)
                            .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
                            .join(' | ');
                    }
                } catch {
                    // Use default message
                }
                throw new Error(msg);
            }

            setUpdatePatientSuccess('Patient information updated successfully!');

            // Refresh patient list
            const updatedList = await fetchPatientList();
            setRecentPatients(updatedList);

            // Close modal after 2 seconds
            setTimeout(() => {
                setShowUpdatePatient(false);
                setSelectedPatient(null);
            }, 2000);
        } catch (err) {
            setUpdatePatientError(err.message || 'Failed to update patient');
        } finally {
            setUpdatePatientLoading(false);
        }
    };

    const handleViewAppointment = (appt) => {
        alert(`View appointment for ${appt.patient} at ${appt.time}`);
    };
    const handleVideoAppointment = (appt) => {
        alert(`Start video call for ${appt.patient} at ${appt.time}`);
    };
    const handleCompleteTask = (task) => {
        alert(`Mark task as complete: ${task.task}`);
    };
    const handleViewAllTasks = () => {
        alert('View all tasks (not implemented)');
    };
    const handleViewAllPatients = () => {
        if (navigate) navigate('/patients');
        else alert('View all patients');
    };

    // Handle Add Patient submission
    const handleAddPatientSubmit = async (e) => {
        e.preventDefault();
        setAddPatientLoading(true);
        setAddPatientError(null);
        setAddPatientSuccess(null);

        try {
            // Register patient via backend with default password
            const res = await fetch(`${API_BASE}/accounts/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newPatient.email,
                    password: 'Patient@123',
                    role: 'patient',
                    first_name: newPatient.first_name,
                    last_name: newPatient.last_name,
                    username: newPatient.email.split('@')[0]
                })
            });

            if (!res.ok) {
                let msg = 'Registration failed';
                try {
                    const errText = await res.text();
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.detail) {
                            msg = errJson.detail;
                        } else if (typeof errJson === 'string') {
                            msg = errJson;
                        } else if (typeof errJson === 'object') {
                            msg = Object.entries(errJson)
                                .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
                                .join(' | ');
                        }
                    } catch {
                        msg = errText || msg;
                    }
                } catch (e) {
                    msg = msg + ' (no error details)';
                }
                throw new Error(msg);
            }

            setAddPatientSuccess('Patient added successfully!');
            setNewPatient({ email: '', first_name: '', last_name: '' });

            // Refresh patient list and stats
            const updatedList = await fetchPatientList();
            setRecentPatients(updatedList);
            await fetchStats();

            // Close modal after 2 seconds
            setTimeout(() => {
                setShowAddPatient(false);
                setAddPatientSuccess(null);
            }, 2000);
        } catch (err) {
            setAddPatientError(err.message || 'Failed to add patient.');
        } finally {
            setAddPatientLoading(false);
        }
    };

    // Quick actions
    const handleQuickAction = (action) => {
        switch (action) {
            case 'New Patient':
                setShowAddPatient(true);
                setAddPatientError(null);
                setAddPatientSuccess(null);
                break;
            case 'Consult':
                alert('Start a new consult');
                break;
            case 'Prescription':
                setShowPrescription(true);
                setPrescriptionError(null);
                setPrescriptionSuccess(null);
                break;
            case 'Reports':
                alert('View reports');
                break;
            default:
                alert(`Action: ${action}`);
        }
    };

    // Prescription submit handler
    const handlePrescriptionSubmit = async (e) => {
        e.preventDefault();
        setPrescriptionLoading(true);
        setPrescriptionError(null);
        setPrescriptionSuccess(null);
        try {
            await createPrescription(prescription);
            setPrescriptionSuccess('Prescription submitted successfully!');
            setPrescription({ patient: '', name: '', dosage: '', frequency: '', next_due: '' });
        } catch (err) {
            setPrescriptionError(err.message || 'Failed to submit prescription');
        } finally {
            setPrescriptionLoading(false);
        }
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-md" className="me-3" />
                            {user && user.first_name && user.last_name && typeof user.first_name === 'string' && typeof user.last_name === 'string' ? (
                                <>{getGreeting()}, Dr. {user.first_name} {user.last_name}!</>
                            ) : user && user.name && typeof user.name === 'string' ? (
                                <>{getGreeting()}, Dr. {user.name}!</>
                            ) : (
                                <>{getGreeting()}, Doctor!</>
                            )}
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Ready to make a difference today</p>
                    </Col>
                </Row>
            </div>

            {/* Statistics Cards */}
            <Row className="mb-4">
                {statsError && (
                    <Col>
                        <div className="text-danger text-center py-3">{statsError}</div>
                    </Col>
                )}
                {statsLoading && !statsError ? (
                    <Col>
                        <div className="text-center py-3">Loading statistics...</div>
                    </Col>
                ) : !statsLoading && !statsError && (
                    <>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="stat-card h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon="calendar-day" className="text-primary mb-3" size="2x" />
                                    <span className="stat-number">{stats.todayAppointments}</span>
                                    <div className="stat-label">Today's Appointments</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="stat-card h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon="users" className="text-primary mb-3" size="2x" />
                                    <span className="stat-number">{stats.totalPatients}</span>
                                    <div className="stat-label">Total Patients</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="stat-card h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon="clock" className="text-primary mb-3" size="2x" />
                                    <span className="stat-number">{stats.pendingConsults}</span>
                                    <div className="stat-label">Pending Consults</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="stat-card h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <FontAwesomeIcon icon="check-circle" className="text-primary mb-3" size="2x" />
                                    <span className="stat-number">{stats.completedToday}</span>
                                    <div className="stat-label">Completed Today</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </>
                )}
            </Row>

            <Row>
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Today's Schedule
                            </span>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Patient</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleLoading ? (
                                        <tr><td colSpan="5" className="text-center">Loading schedule...</td></tr>
                                    ) : scheduleError ? (
                                        <tr><td colSpan="5" className="text-danger text-center">{scheduleError}</td></tr>
                                    ) : todaySchedule.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted">No appointments scheduled for today.</td></tr>
                                    ) : (
                                        todaySchedule.map(appt => {
                                            const meta = getStatusMeta('appointment', appt.status);
                                            return (
                                                <tr key={appt.id}>
                                                    <td className="fw-bold">{appt.time}</td>
                                                    <td>
                                                        {typeof appt.patient === 'object' && appt.patient
                                                            ? `${appt.patient.first_name || ''} ${appt.patient.last_name || ''}`.trim() || appt.patient.email || 'Unknown'
                                                            : appt.patient || 'Unknown'}
                                                    </td>
                                                    <td>{appt.type}</td>
                                                    <td><span className={`badge ${meta.badgeClass}`}>{meta.label}</span></td>
                                                    <td className="quick-actions">
                                                        <button type="button" className="btn-icon me-1" title="View" onClick={() => handleViewAppointment(appt)}>
                                                            <FontAwesomeIcon icon="eye" />
                                                        </button>
                                                        <button type="button" className="btn-icon" title="Video" onClick={() => handleVideoAppointment(appt)}>
                                                            <FontAwesomeIcon icon="video" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Pending Tasks */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100 border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="tasks" className="me-2" />
                            Pending Tasks
                        </Card.Header>
                        <Card.Body>
                            {pendingTasks.map(task => {
                                const pm = priorityMeta[task.priority] || { label: task.priority, badgeClass: 'badge-soft-secondary' };
                                const icon = task.type === 'review' ? 'clipboard-check' : task.type === 'prescription' ? 'pills' : 'file-medical';
                                return (
                                    <div key={task.id} className="d-flex align-items-center justify-content-between mb-3 p-3 rounded border-0 shadow-sm bg-white position-relative task-tile">
                                        <div className="d-flex align-items-center flex-grow-1">
                                            <div className="me-3">
                                                <FontAwesomeIcon icon={icon} className="text-primary" />
                                            </div>
                                            <div className="flex-grow-1">
                                                <p className="mb-1 small fw-semibold">{task.task}</p>
                                                <span className={`badge ${pm.badgeClass}`}>{pm.label}</span>
                                            </div>
                                        </div>
                                        <div className="ms-2">
                                            <button type="button" className="btn-icon" title="Complete" onClick={() => handleCompleteTask(task)}>
                                                <FontAwesomeIcon icon="circle-check" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <Button variant="link" className="p-0 text-primary fw-semibold" onClick={handleViewAllTasks}>
                                View all tasks <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Recent Patients */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-friends" className="me-2" />
                            Recent Patients
                        </Card.Header>
                        <Card.Body>
                            {patientsLoading && <div className="text-center py-4">Loading patients...</div>}
                            {patientsError && <div className="text-danger py-2">{patientsError}</div>}
                            {!patientsLoading && !patientsError && recentPatients.length === 0 && (
                                <div className="text-center py-4 text-muted">No patients found.</div>
                            )}
                            {!patientsLoading && !patientsError && recentPatients.map(p => (
                                <div key={p.id} className="d-flex align-items-center justify-content-between p-3 mb-2 rounded bg-white shadow-sm patient-tile">
                                    <div className="d-flex align-items-center flex-grow-1">
                                        <div className="me-3">
                                            <FontAwesomeIcon icon="user-circle" className="text-primary" size="lg" />
                                        </div>
                                        <div>
                                            <h6 className="mb-1 fw-semibold">{p.name}</h6>
                                            <small className="text-muted d-block">{p.condition ? p.condition : '—'}</small>
                                        </div>
                                    </div>
                                    <div className="quick-actions">
                                        <button type="button" className="btn-icon me-1" title="View Patient" onClick={() => handleViewPatient(p)}>
                                            <FontAwesomeIcon icon="eye" />
                                        </button>
                                        <button type="button" className="btn-icon" title="Edit Patient" onClick={() => handleEditPatient(p)}>
                                            <FontAwesomeIcon icon="pen-to-square" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <Button className="btn-gradient-primary w-100 fw-semibold mt-2" onClick={handleViewAllPatients}>
                                <FontAwesomeIcon icon="users" className="me-2" /> View All Patients
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Quick Actions */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6} className="mb-3"><QuickActionTile icon="plus" label="New Patient" accent="blue-theme" onClick={() => handleQuickAction('New Patient')} /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="video" label="Consult" accent="blue-theme" onClick={() => handleQuickAction('Consult')} /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="prescription" label="Prescription" accent="blue-theme" onClick={() => handleQuickAction('Prescription')} /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="chart-bar" label="Reports" accent="blue-theme" onClick={() => handleQuickAction('Reports')} /></Col>
                            </Row>
                        </Card.Body>
                    </Card>
                    {/* Prescription Modal */}
                    <Modal show={showPrescription} onHide={() => { setShowPrescription(false); setPrescriptionError(null); setPrescriptionSuccess(null); }} size="lg">
                        <Modal.Header closeButton>
                            <Modal.Title>
                                <FontAwesomeIcon icon="pills" className="me-2" />
                                Prescribe Medication
                            </Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={handlePrescriptionSubmit}>
                            <Modal.Body>
                                {prescriptionError && <Alert variant="danger">{prescriptionError}</Alert>}
                                {prescriptionSuccess && <Alert variant="success">{prescriptionSuccess}</Alert>}

                                <Form.Group className="mb-3" controlId="prescriptionPatient">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="user" className="me-2" />
                                        Patient ID or Email <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={prescription.patient}
                                        onChange={e => setPrescription(p => ({ ...p, patient: e.target.value }))}
                                        placeholder="Enter patient ID or email"
                                    />
                                    <Form.Text className="text-muted">
                                        Enter the patient's ID number or email address
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="prescriptionName">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="pills" className="me-2" />
                                        Medication Name <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={prescription.name}
                                        onChange={e => setPrescription(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g., Lisinopril, Metformin, Aspirin"
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3" controlId="prescriptionDosage">
                                            <Form.Label>
                                                <FontAwesomeIcon icon="prescription" className="me-2" />
                                                Dosage <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                required
                                                value={prescription.dosage}
                                                onChange={e => setPrescription(p => ({ ...p, dosage: e.target.value }))}
                                                placeholder="e.g., 10mg, 500mg, 1 tablet"
                                            />
                                            <Form.Text className="text-muted">
                                                Specify the amount per dose
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3" controlId="prescriptionFrequency">
                                            <Form.Label>
                                                <FontAwesomeIcon icon="clock" className="me-2" />
                                                Frequency <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                required
                                                value={prescription.frequency}
                                                onChange={e => setPrescription(p => ({ ...p, frequency: e.target.value }))}
                                                placeholder="e.g., Once daily, Twice daily"
                                            />
                                            <Form.Text className="text-muted">
                                                How often to take the medication
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3" controlId="prescriptionNextDue">
                                    <Form.Label>
                                        <FontAwesomeIcon icon="calendar" className="me-2" />
                                        Next Due Date
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={prescription.next_due}
                                        onChange={e => setPrescription(p => ({ ...p, next_due: e.target.value }))}
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
                                <Button variant="secondary" onClick={() => setShowPrescription(false)} disabled={prescriptionLoading}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="btn-gradient-primary" disabled={prescriptionLoading}>
                                    {prescriptionLoading ? (
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

                    {/* Update Patient Modal */}
                    <Modal show={showUpdatePatient} onHide={() => { setShowUpdatePatient(false); setUpdatePatientError(null); setUpdatePatientSuccess(null); setSelectedPatient(null); }}>
                        <Modal.Header closeButton>
                            <Modal.Title>Update Patient Information</Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={handleUpdatePatientSubmit}>
                            <Modal.Body>
                                {updatePatientError && <Alert variant="danger">{updatePatientError}</Alert>}
                                {updatePatientSuccess && <Alert variant="success">{updatePatientSuccess}</Alert>}
                                <Form.Group className="mb-3" controlId="updateFirstName">
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={updatedPatientData.first_name}
                                        onChange={e => setUpdatedPatientData(d => ({ ...d, first_name: e.target.value }))}
                                        placeholder="Enter first name"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="updateLastName">
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={updatedPatientData.last_name}
                                        onChange={e => setUpdatedPatientData(d => ({ ...d, last_name: e.target.value }))}
                                        placeholder="Enter last name"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="updateCondition">
                                    <Form.Label>Primary Condition</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={updatedPatientData.primary_condition}
                                        onChange={e => setUpdatedPatientData(d => ({ ...d, primary_condition: e.target.value }))}
                                        placeholder="Enter primary condition"
                                    />
                                </Form.Group>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button
                                    variant="secondary"
                                    onClick={() => { setShowUpdatePatient(false); setSelectedPatient(null); }}
                                    disabled={updatePatientLoading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="btn-gradient-primary" disabled={updatePatientLoading}>
                                    {updatePatientLoading ? <Spinner size="sm" animation="border" /> : 'Update Patient'}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>

                    {/* Add Patient Modal */}
                    <Modal show={showAddPatient} onHide={() => { setShowAddPatient(false); setAddPatientError(null); setAddPatientSuccess(null); }}>
                        <Modal.Header closeButton>
                            <Modal.Title>Add New Patient</Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={handleAddPatientSubmit}>
                            <Modal.Body>
                                {addPatientError && <Alert variant="danger">{addPatientError}</Alert>}
                                {addPatientSuccess && <Alert variant="success">{addPatientSuccess}</Alert>}
                                <Form.Group className="mb-3" controlId="addPatientEmail">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" required value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="addPatientFirstName">
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control type="text" required value={newPatient.first_name} onChange={e => setNewPatient(p => ({ ...p, first_name: e.target.value }))} />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="addPatientLastName">
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control type="text" required value={newPatient.last_name} onChange={e => setNewPatient(p => ({ ...p, last_name: e.target.value }))} />
                                </Form.Group>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowAddPatient(false)} disabled={addPatientLoading}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={addPatientLoading}>
                                    {addPatientLoading ? <Spinner size="sm" animation="border" /> : 'Add Patient'}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>
                </Col>
            </Row>

            {/* Patient Assignment Requests Row */}
            <Row id="assignment-requests">
                <Col lg={12} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-plus" className="me-2" />
                            Patient Assignment Requests
                        </Card.Header>
                        <Card.Body>
                            {requestsLoading && (
                                <div className="text-center py-4">
                                    <Spinner animation="border" role="status">
                                        <span className="visually-hidden">Loading requests...</span>
                                    </Spinner>
                                </div>
                            )}
                            {requestsError && (
                                <Alert variant="danger">{requestsError}</Alert>
                            )}
                            {!requestsLoading && !requestsError && doctorRequests.length === 0 && (
                                <div className="text-center py-4 text-muted">
                                    No pending patient assignment requests.
                                </div>
                            )}
                            {!requestsLoading && !requestsError && doctorRequests.length > 0 && (
                                <Row>
                                    {doctorRequests.map(request => (
                                        <Col md={6} lg={4} key={request.id} className="mb-3">
                                            <Card className="h-100 border shadow-sm">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div>
                                                            <h6 className="fw-bold mb-1">{request.patientName}</h6>
                                                            <small className="text-muted">{request.patientEmail}</small>
                                                        </div>
                                                        {request.urgent && (
                                                            <span className="badge bg-danger">Urgent</span>
                                                        )}
                                                    </div>

                                                    <div className="mb-2">
                                                        <strong className="small">Reason:</strong>
                                                        <p className="mb-1 small">{request.reason}</p>
                                                    </div>

                                                    {request.symptoms && (
                                                        <div className="mb-2">
                                                            <strong className="small">Symptoms:</strong>
                                                            <p className="mb-1 small">{request.symptoms}</p>
                                                        </div>
                                                    )}

                                                    {request.preferredDate && (
                                                        <div className="mb-2">
                                                            <small className="text-muted">
                                                                <FontAwesomeIcon icon="calendar" className="me-1" />
                                                                {new Date(request.preferredDate).toLocaleDateString()}
                                                                {request.preferredTime && ` at ${request.preferredTime}`}
                                                            </small>
                                                        </div>
                                                    )}

                                                    <div className="mb-2">
                                                        <small className="text-muted">
                                                            <FontAwesomeIcon icon="clock" className="me-1" />
                                                            Requested {new Date(request.createdAt).toLocaleDateString()}
                                                        </small>
                                                    </div>

                                                    <div className="d-flex gap-2 mt-3">
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            className="flex-fill"
                                                            onClick={() => handleAcceptRequest(request.id)}
                                                            disabled={!request.canAccept}
                                                        >
                                                            <FontAwesomeIcon icon="check" className="me-1" />
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="flex-fill"
                                                            onClick={() => handleDeclineRequest(request.id)}
                                                            disabled={!request.canDecline}
                                                        >
                                                            <FontAwesomeIcon icon="times" className="me-1" />
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DoctorDashboard;