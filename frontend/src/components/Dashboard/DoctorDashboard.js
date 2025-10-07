import React, { useState, useEffect } from 'react';
import { Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { getStatusMeta } from '../../utils/statusStyles';
import { fetchPatientList } from '../../services/healthService';
import API_BASE from '../../config';

const DoctorDashboard = () => {
    const { user } = useAuth();
    // State for add patient modal (all hooks must be at top level)
    const [showAddPatient, setShowAddPatient] = useState(false);
    const [addPatientLoading, setAddPatientLoading] = useState(false);
    const [addPatientError, setAddPatientError] = useState(null);
    const [addPatientSuccess, setAddPatientSuccess] = useState(null);
    const [newPatient, setNewPatient] = useState({
        email: '',
        first_name: '',
        last_name: ''
    });
    const [stats] = useState({
        todayAppointments: 8,
        totalPatients: 156,
        pendingConsults: 3,
        completedToday: 5
    });

    // Add patient handler
    const handleAddPatient = async (e) => {
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
                            // Collect all field errors
                            msg = Object.entries(errJson)
                                .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
                                .join(' | ');
                        }
                    } catch {
                        // Not JSON, show raw text
                        msg = errText || msg;
                    }
                } catch (e) {
                    msg = msg + ' (no error details)';
                }
                throw new Error(msg);
            }
            setAddPatientSuccess('Patient added successfully!');
            setNewPatient({ email: '', first_name: '', last_name: '' });
            // Refresh patient list after successful add
            const updatedList = await fetchPatientList();
            setRecentPatients(updatedList);
        } catch (err) {
            setAddPatientError(err.message);
        } finally {
            setAddPatientLoading(false);
        }
    };

    const [todaySchedule] = useState([
        { id: 1, time: '09:00 AM', patient: 'John Baraza', type: 'Follow-up', status: 'completed' },
        { id: 2, time: '10:00 AM', patient: 'Sarah Wangeci', type: 'Consultation', status: 'in-progress' },
        { id: 3, time: '11:00 AM', patient: 'Mike Otieno', type: 'Check-up', status: 'scheduled' },
        { id: 4, time: '02:00 PM', patient: 'Emily Mathenge', type: 'Urgent', status: 'scheduled' }
    ]);

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

    const priorityMeta = {
        high: { label: 'High', badgeClass: 'badge-soft-danger' },
        medium: { label: 'Medium', badgeClass: 'badge-soft-warning' },
        low: { label: 'Low', badgeClass: 'badge-soft-success' }
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-md" className="me-3" />
                            Good morning, Dr. {user.name}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Ready to make a difference today</p>
                    </Col>
                </Row>
            </div>

            {/* Statistics Cards */}
            <Row className="mb-4">
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
                            <FontAwesomeIcon icon="users" className="text-success mb-3" size="2x" />
                            <span className="stat-number">{stats.totalPatients}</span>
                            <div className="stat-label">Total Patients</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100 border-0 shadow-sm">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="clock" className="text-warning mb-3" size="2x" />
                            <span className="stat-number">{stats.pendingConsults}</span>
                            <div className="stat-label">Pending Consults</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100 border-0 shadow-sm">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="check-circle" className="text-info mb-3" size="2x" />
                            <span className="stat-number">{stats.completedToday}</span>
                            <div className="stat-label">Completed Today</div>
                        </Card.Body>
                    </Card>
                </Col>
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
                            <Button size="sm" className="btn-gradient-primary" onClick={() => setShowAddPatient(true)}>
                                <FontAwesomeIcon icon="plus" className="me-1" /> Add Patient
                            </Button>
                            {/* Add Patient Modal */}
                            <Modal show={showAddPatient} onHide={() => { setShowAddPatient(false); setAddPatientError(null); setAddPatientSuccess(null); }}>
                                <Modal.Header closeButton>
                                    <Modal.Title>Add New Patient</Modal.Title>
                                </Modal.Header>
                                <Form onSubmit={handleAddPatient}>
                                    <Modal.Body>
                                        {addPatientError && <Alert variant="danger">{addPatientError}</Alert>}
                                        {addPatientSuccess && <Alert variant="success">{addPatientSuccess}</Alert>}
                                        <Form.Group className="mb-3" controlId="addPatientEmail">
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control type="email" required value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
                                        </Form.Group>
                                        <Form.Group className="mb-3" controlId="addPatientFirstName">
                                            <Form.Label>First Name</Form.Label>
                                            <Form.Control type="text" value={newPatient.first_name} onChange={e => setNewPatient(p => ({ ...p, first_name: e.target.value }))} />
                                        </Form.Group>
                                        <Form.Group className="mb-3" controlId="addPatientLastName">
                                            <Form.Label>Last Name</Form.Label>
                                            <Form.Control type="text" value={newPatient.last_name} onChange={e => setNewPatient(p => ({ ...p, last_name: e.target.value }))} />
                                        </Form.Group>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button variant="secondary" onClick={() => setShowAddPatient(false)} disabled={addPatientLoading}>Cancel</Button>
                                        <Button type="submit" className="btn-gradient-primary" disabled={addPatientLoading}>
                                            {addPatientLoading ? <Spinner size="sm" animation="border" /> : 'Add Patient'}
                                        </Button>
                                    </Modal.Footer>
                                </Form>
                            </Modal>
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
                                    {todaySchedule.map(appt => {
                                        const meta = getStatusMeta('appointment', appt.status);
                                        return (
                                            <tr key={appt.id}>
                                                <td className="fw-bold">{appt.time}</td>
                                                <td>{appt.patient}</td>
                                                <td>{appt.type}</td>
                                                <td><span className={`badge ${meta.badgeClass}`}>{meta.label}</span></td>
                                                <td className="quick-actions">
                                                    <button type="button" className="btn-icon me-1" title="View">
                                                        <FontAwesomeIcon icon="eye" />
                                                    </button>
                                                    <button type="button" className="btn-icon" title="Video">
                                                        <FontAwesomeIcon icon="video" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                const icon = task.type === 'review' ? 'clipboard-check' : task.type === 'prescription' ? 'prescription' : 'edit';
                                return (
                                    <div key={task.id} className="d-flex align-items-start mb-3 p-3 rounded border-0 shadow-sm bg-white position-relative task-tile">
                                        <div className="me-3 mt-1">
                                            <div className={`btn-icon`}>
                                                <FontAwesomeIcon icon={icon} />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <p className="mb-1 small fw-semibold">{task.task}</p>
                                            <span className={`badge ${pm.badgeClass}`}>{pm.label}</span>
                                        </div>
                                        <div>
                                            <button type="button" className="btn-icon" title="Complete">
                                                <FontAwesomeIcon icon="check" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <Button variant="link" className="p-0 text-primary fw-semibold">
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
                                    <div>
                                        <h6 className="mb-1 fw-semibold">{p.name}</h6>
                                        <small className="text-muted d-block">{p.condition || <span className="text-muted">—</span>}</small>
                                    </div>
                                    <div className="text-end">
                                        <div>
                                            <button type="button" className="btn-icon" title="View">
                                                <FontAwesomeIcon icon="eye" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button className="btn-gradient-primary w-100 fw-semibold mt-2" onClick={() => setShowAddPatient(true)}>
                                <FontAwesomeIcon icon="plus" className="me-2" /> Add Patient
                            </Button>
                            <Button className="btn-gradient-primary w-100 fw-semibold mt-2">
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
                                <Col md={6} className="mb-3"><QuickActionTile icon="plus" label="New Patient" accent="blue-theme" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="video" label="Consult" accent="blue-theme" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="prescription" label="Prescription" accent="blue-theme" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="chart-bar" label="Reports" accent="blue-theme" /></Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DoctorDashboard;