import React, { useEffect, useState } from 'react';
import {
    fetchAllUsers,
    createDoctor, updateDoctor, deleteDoctor,
    createPatient, updatePatient, deletePatient,
    createCaregiver, updateCaregiver, deleteCaregiver,
    fetchAnalytics,
    fetchAllAppointments
} from '../../services/adminService';
import { Card, Table, Button, Modal, Form, Alert, Spinner, Tabs, Tab, Row, Col, Badge, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';

const AdminDashboard = () => {
    const [patients, setPatients] = useState([]);
    const [allPatients, setAllPatients] = useState([]);
    const [caregivers, setCaregivers] = useState([]);
    const [allCaregivers, setAllCaregivers] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [doctorSearch, setDoctorSearch] = useState('');
    const [patientSearch, setPatientSearch] = useState('');
    const [caregiverSearch, setCaregiverSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Analytics state
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Appointments state
    const [appointments, setAppointments] = useState([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);
    const [appointmentFilters, setAppointmentFilters] = useState({});

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add-doctor', 'edit-doctor', 'add-patient', etc.
    const [selectedUser, setSelectedUser] = useState(null);

    // Form state
    const [userForm, setUserForm] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        primary_condition: ''
    });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState('analytics');

    useEffect(() => {
        loadUsers();
        loadAnalytics();
    }, []);


    // Memoize loadAppointments to avoid dependency warning
    const loadAppointments = React.useCallback(async () => {
        setAppointmentsLoading(true);
        try {
            const data = await fetchAllAppointments(appointmentFilters);
            if (data.results) {
                setAppointments(data.results);
            } else if (Array.isArray(data)) {
                setAppointments(data);
            }
        } catch (e) {
            console.error('Failed to load appointments:', e);
        } finally {
            setAppointmentsLoading(false);
        }
    }, [appointmentFilters]);

    useEffect(() => {
        if (activeTab === 'appointments') {
            loadAppointments();
        }
    }, [activeTab, appointmentFilters, loadAppointments]);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetchAllUsers();
            let users = [];
            if (Array.isArray(res)) {
                users = res;
            } else if (res && Array.isArray(res.results)) {
                users = res.results;
            }
            const patients = users.filter(u => u.role === 'patient');
            const caregivers = users.filter(u => u.role === 'caregiver');
            const doctors = users.filter(u => u.role === 'doctor');
            setAllPatients(patients);
            setPatients(patients);
            setAllCaregivers(caregivers);
            setCaregivers(caregivers);
            setAllDoctors(doctors);
            setDoctors(doctors);
        } catch (e) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const data = await fetchAnalytics();
            setAnalytics(data);
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setAnalyticsLoading(false);
        }
    };


    // Modal helpers
    const openModal = (type, user = null) => {
        setModalType(type);
        setSelectedUser(user);
        if (user) {
            setUserForm({
                email: user.email || '',
                password: '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                primary_condition: user.primary_condition || ''
            });
        } else {
            setUserForm({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                primary_condition: ''
            });
        }
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedUser(null);
        setModalType('');
        setUserForm({ email: '', password: '', first_name: '', last_name: '', primary_condition: '' });
        setFormError('');
    };

    // Delete handlers
    const handleDelete = async (userType, userId) => {
        if (!window.confirm(`Delete this ${userType}?`)) return;
        try {
            if (userType === 'doctor') await deleteDoctor(userId);
            else if (userType === 'patient') await deletePatient(userId);
            else if (userType === 'caregiver') await deleteCaregiver(userId);
            loadUsers();
        } catch (e) {
            setError(`Failed to delete ${userType}`);
        }
    };

    // Form submit handler
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            const isEdit = modalType.startsWith('edit');
            const userType = modalType.replace('add-', '').replace('edit-', '');

            if (isEdit) {
                // Update user
                const updateData = {
                    first_name: userForm.first_name,
                    last_name: userForm.last_name,
                };
                if (userType === 'patient' && userForm.primary_condition) {
                    updateData.primary_condition = userForm.primary_condition;
                }

                if (userType === 'doctor') await updateDoctor(selectedUser.id, updateData);
                else if (userType === 'patient') await updatePatient(selectedUser.id, updateData);
                else if (userType === 'caregiver') await updateCaregiver(selectedUser.id, updateData);
            } else {
                // Create user
                const createData = {
                    email: userForm.email,
                    password: userForm.password,
                    first_name: userForm.first_name,
                    last_name: userForm.last_name,
                    role: userForm.role,
                };
                // Generate username from email if not provided
                if (!userForm.username || userForm.username.trim() === '') {
                    createData.username = userForm.email.split('@')[0];
                } else {
                    createData.username = userForm.username;
                }
                if (userType === 'patient' && userForm.primary_condition) {
                    createData.primary_condition = userForm.primary_condition;
                }

                if (userType === 'doctor') await createDoctor(createData);
                else if (userType === 'patient') await createPatient(createData);
                else if (userType === 'caregiver') await createCaregiver(createData);
            }

            closeModal();
            loadUsers();
        } catch (e) {
            setFormError(e.message || 'Operation failed');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <Card className="mt-4">
            <Card.Header>
                <h3>Admin Dashboard</h3>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? <Spinner animation="border" /> : (
                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="admin-dashboard-tabs" className="mb-3">
                        <Tab eventKey="analytics" title={<><FontAwesomeIcon icon="chart-line" className="me-2" />Analytics</>}>
                            {analyticsLoading ? (
                                <div className="text-center py-5"><Spinner animation="border" /></div>
                            ) : analytics ? (
                                <>
                                    {/* Stats Cards */}
                                    <Row className="mb-4">
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Total Users</h6>
                                                    <h2 className="text-primary">{analytics.users.total}</h2>
                                                    <small className="text-success">+{analytics.users.recent_registrations} this month</small>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Total Appointments</h6>
                                                    <h2 className="text-info">{analytics.appointments.total}</h2>
                                                    <small>{analytics.appointments.today} today</small>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Medications</h6>
                                                    <h2 className="text-warning">{analytics.medications.total}</h2>
                                                    <small>{analytics.medications.active} active</small>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Avg Compliance</h6>
                                                    <h2 className="text-success">{analytics.medications.avg_compliance}%</h2>
                                                    <ProgressBar
                                                        now={analytics.medications.avg_compliance}
                                                        variant="success"
                                                        className="mt-2"
                                                    />
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* User Breakdown */}
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <Card>
                                                <Card.Header><strong>User Distribution</strong></Card.Header>
                                                <Card.Body>
                                                    <Table size="sm">
                                                        <tbody>
                                                            <tr>
                                                                <td>Patients</td>
                                                                <td className="text-end"><Badge bg="primary">{analytics.users.patients}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>Doctors</td>
                                                                <td className="text-end"><Badge bg="info">{analytics.users.doctors}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>Caregivers</td>
                                                                <td className="text-end"><Badge bg="warning">{analytics.users.caregivers}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>Admins</td>
                                                                <td className="text-end"><Badge bg="danger">{analytics.users.admins}</Badge></td>
                                                            </tr>
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card>
                                                <Card.Header><strong>Appointment Status</strong></Card.Header>
                                                <Card.Body>
                                                    <Table size="sm">
                                                        <tbody>
                                                            <tr>
                                                                <td>Scheduled</td>
                                                                <td className="text-end"><Badge bg="primary">{analytics.appointments.scheduled}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>Completed</td>
                                                                <td className="text-end"><Badge bg="success">{analytics.appointments.completed}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>Cancelled</td>
                                                                <td className="text-end"><Badge bg="danger">{analytics.appointments.cancelled}</Badge></td>
                                                            </tr>
                                                            <tr>
                                                                <td>This Week</td>
                                                                <td className="text-end"><Badge bg="info">{analytics.appointments.this_week}</Badge></td>
                                                            </tr>
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Insights */}
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <Card>
                                                <Card.Header><strong>Top Patient Conditions</strong></Card.Header>
                                                <Card.Body>
                                                    {analytics.insights.top_conditions.length > 0 ? (
                                                        <Table size="sm">
                                                            <tbody>
                                                                {analytics.insights.top_conditions.map((condition, idx) => (
                                                                    <tr key={idx}>
                                                                        <td>{condition.primary_condition}</td>
                                                                        <td className="text-end">{condition.count} patients</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    ) : (
                                                        <p className="text-muted">No condition data available</p>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card>
                                                <Card.Header><strong>Doctor Workload (Scheduled)</strong></Card.Header>
                                                <Card.Body>
                                                    {analytics.insights.doctor_workload.length > 0 ? (
                                                        <Table size="sm">
                                                            <tbody>
                                                                {analytics.insights.doctor_workload.map((doc, idx) => (
                                                                    <tr key={idx}>
                                                                        <td>{doc.doctor__first_name} {doc.doctor__last_name}</td>
                                                                        <td className="text-end">{doc.appointment_count} appointments</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    ) : (
                                                        <p className="text-muted">No scheduled appointments</p>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Health Metrics */}
                                    <Row>
                                        <Col md={12}>
                                            <Card>
                                                <Card.Header><strong>Health Data Summary</strong></Card.Header>
                                                <Card.Body>
                                                    <Row>
                                                        <Col md={4} className="text-center">
                                                            <h5>Vital Readings</h5>
                                                            <h3 className="text-primary">{analytics.health.total_vitals}</h3>
                                                            <small className="text-muted">+{analytics.health.recent_vitals} this week</small>
                                                        </Col>
                                                        <Col md={4} className="text-center">
                                                            <h5>Symptom Logs</h5>
                                                            <h3 className="text-warning">{analytics.health.total_symptoms}</h3>
                                                        </Col>
                                                        <Col md={4} className="text-center">
                                                            <h5>Lab Results</h5>
                                                            <h3 className="text-info">{analytics.health.total_labs}</h3>
                                                        </Col>
                                                    </Row>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </>
                            ) : (
                                <Alert variant="info">No analytics data available</Alert>
                            )}
                        </Tab>

                        <Tab eventKey="appointments" title={<><FontAwesomeIcon icon="calendar" className="me-2" />Appointments</>}>
                            {appointmentsLoading ? (
                                <div className="text-center py-5"><Spinner animation="border" /></div>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <Form inline="true">
                                            <Row>
                                                <Col md={3}>
                                                    <Form.Select
                                                        size="sm"
                                                        value={appointmentFilters.status || ''}
                                                        onChange={(e) => setAppointmentFilters({ ...appointmentFilters, status: e.target.value })}
                                                    >
                                                        <option value="">All Statuses</option>
                                                        <option value="scheduled">Scheduled</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                        <option value="in-progress">In Progress</option>
                                                    </Form.Select>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Control
                                                        type="date"
                                                        size="sm"
                                                        value={appointmentFilters.date || ''}
                                                        onChange={(e) => setAppointmentFilters({ ...appointmentFilters, date: e.target.value })}
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setAppointmentFilters({})}
                                                    >
                                                        Clear Filters
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>
                                    <Table striped bordered hover responsive>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Patient</th>
                                                <th>Doctor</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {appointments.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center">No appointments found</td></tr>
                                            ) : (
                                                appointments.map(apt => (
                                                    <tr key={apt.id}>
                                                        <td>{apt.id}</td>
                                                        <td>{apt.date}</td>
                                                        <td>{apt.time}</td>
                                                        <td>{apt.patient_name || `Patient #${apt.patient_id}`}</td>
                                                        <td>{apt.doctor_name || `Doctor #${apt.doctor_id}`}</td>
                                                        <td>{apt.type}</td>
                                                        <td>
                                                            <Badge bg={
                                                                apt.status === 'completed' ? 'success' :
                                                                    apt.status === 'cancelled' ? 'danger' :
                                                                        apt.status === 'in-progress' ? 'warning' :
                                                                            'primary'
                                                            }>
                                                                {apt.status}
                                                            </Badge>
                                                        </td>
                                                        <td>{apt.notes || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </Table>
                                </>
                            )}
                        </Tab>

                        <Tab eventKey="doctors" title={<><FontAwesomeIcon icon="user-md" className="me-2" />Doctors</>}>
                            <Row className="mb-2 align-items-center">
                                <Col md={4}>
                                    <Button variant="primary" onClick={() => openModal('add-doctor')}>
                                        <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Doctor
                                    </Button>
                                </Col>
                                <Col md={4} className="ms-auto">
                                    <Form className="d-flex">
                                        <Form.Control
                                            size="sm"
                                            type="search"
                                            placeholder="Search doctors..."
                                            className="me-2"
                                            value={doctorSearch}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setDoctorSearch(val);
                                                setDoctors(
                                                    allDoctors.filter(d =>
                                                        d.email.toLowerCase().includes(val.toLowerCase()) ||
                                                        d.first_name.toLowerCase().includes(val.toLowerCase()) ||
                                                        d.last_name.toLowerCase().includes(val.toLowerCase())
                                                    )
                                                );
                                            }}
                                        />
                                        <Button size="sm" variant="outline-secondary" disabled>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </Form>
                                </Col>
                            </Row>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Email</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center">No doctors found</td></tr>
                                    ) : (
                                        doctors.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td>{u.email}</td>
                                                <td>{u.first_name}</td>
                                                <td>{u.last_name}</td>
                                                <td>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => openModal('edit-doctor', u)}
                                                            aria-label="Edit doctor"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Delete</Tooltip>}>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete('doctor', u.id)}
                                                            aria-label="Delete doctor"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Tab>
                        <Tab eventKey="patients" title={<><FontAwesomeIcon icon="user-injured" className="me-2" />Patients</>}>
                            <Row className="mb-2 align-items-center">
                                <Col md={4}>
                                    <Button variant="primary" onClick={() => openModal('add-patient')}>
                                        <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Patient
                                    </Button>
                                </Col>
                                <Col md={4} className="ms-auto">
                                    <Form className="d-flex">
                                        <Form.Control
                                            size="sm"
                                            type="search"
                                            placeholder="Search patients..."
                                            className="me-2"
                                            value={patientSearch}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setPatientSearch(val);
                                                setPatients(
                                                    allPatients.filter(p =>
                                                        p.email.toLowerCase().includes(val.toLowerCase()) ||
                                                        p.first_name.toLowerCase().includes(val.toLowerCase()) ||
                                                        p.last_name.toLowerCase().includes(val.toLowerCase())
                                                    )
                                                );
                                            }}
                                        />
                                        <Button size="sm" variant="outline-secondary" disabled>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </Form>
                                </Col>
                            </Row>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Email</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Primary Condition</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center">No patients found</td></tr>
                                    ) : (
                                        patients.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td>{u.email}</td>
                                                <td>{u.first_name}</td>
                                                <td>{u.last_name}</td>
                                                <td>{u.primary_condition || 'N/A'}</td>
                                                <td>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => openModal('edit-patient', u)}
                                                            aria-label="Edit patient"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Delete</Tooltip>}>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete('patient', u.id)}
                                                            aria-label="Delete patient"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Tab>
                        <Tab eventKey="caregivers" title={<><FontAwesomeIcon icon="user-nurse" className="me-2" />Caregivers</>}>
                            <Row className="mb-2 align-items-center">
                                <Col md={4}>
                                    <Button variant="primary" onClick={() => openModal('add-caregiver')}>
                                        <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Caregiver
                                    </Button>
                                </Col>
                                <Col md={4} className="ms-auto">
                                    <Form className="d-flex">
                                        <Form.Control
                                            size="sm"
                                            type="search"
                                            placeholder="Search caregivers..."
                                            className="me-2"
                                            value={caregiverSearch}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setCaregiverSearch(val);
                                                setCaregivers(
                                                    allCaregivers.filter(c =>
                                                        c.email.toLowerCase().includes(val.toLowerCase()) ||
                                                        c.first_name.toLowerCase().includes(val.toLowerCase()) ||
                                                        c.last_name.toLowerCase().includes(val.toLowerCase())
                                                    )
                                                );
                                            }}
                                        />
                                        <Button size="sm" variant="outline-secondary" disabled>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </Form>
                                </Col>
                            </Row>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Email</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {caregivers.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center">No caregivers found</td></tr>
                                    ) : (
                                        caregivers.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td>{u.email}</td>
                                                <td>{u.first_name}</td>
                                                <td>{u.last_name}</td>
                                                <td>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit</Tooltip>}>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => openModal('edit-caregiver', u)}
                                                            aria-label="Edit caregiver"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Delete</Tooltip>}>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete('caregiver', u.id)}
                                                            aria-label="Delete caregiver"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Tab>
                    </Tabs>
                )}
            </Card.Body>

            {/* Universal User Modal for Add/Edit */}
            <Modal show={showModal} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {modalType.startsWith('add') ? 'Add' : 'Edit'} {modalType.replace('add-', '').replace('edit-', '').charAt(0).toUpperCase() + modalType.replace('add-', '').replace('edit-', '').slice(1)}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleFormSubmit}>
                    <Modal.Body>
                        {formError && <Alert variant="danger">{formError}</Alert>}

                        {!modalType.startsWith('edit') && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        required
                                        value={userForm.email}
                                        onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Password *</Form.Label>
                                    <Form.Control
                                        type="password"
                                        required
                                        value={userForm.password}
                                        onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                </Form.Group>
                            </>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                                value={userForm.first_name}
                                onChange={e => setUserForm(f => ({ ...f, first_name: e.target.value }))}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                                value={userForm.last_name}
                                onChange={e => setUserForm(f => ({ ...f, last_name: e.target.value }))}
                            />
                        </Form.Group>

                        {/* Role selector for admin control */}
                        <Form.Group className="mb-3">
                            <Form.Label>Role</Form.Label>
                            <Form.Select
                                value={userForm.role}
                                onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                                required
                            >
                                <option value="">Select role...</option>
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="caregiver">Caregiver</option>
                                <option value="admin">Admin</option>
                            </Form.Select>
                        </Form.Group>

                        {(modalType.includes('patient')) && (
                            <Form.Group className="mb-3">
                                <Form.Label>Primary Condition</Form.Label>
                                <Form.Control
                                    value={userForm.primary_condition}
                                    onChange={e => setUserForm(f => ({ ...f, primary_condition: e.target.value }))}
                                    placeholder="e.g., Diabetes, Hypertension"
                                />
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={formLoading}>
                            {formLoading ? 'Saving...' : (modalType.startsWith('add') ? 'Create' : 'Update')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Card>
    );
}

export default AdminDashboard;
