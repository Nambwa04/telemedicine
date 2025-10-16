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
import Chart from 'chart.js/auto';
import { useLocation, useNavigate } from 'react-router-dom';

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
    const [analyticsFilters, setAnalyticsFilters] = useState({ date_from: '', date_to: '' });
    const navigate = useNavigate();
    const location = useLocation();

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
        // Initialize filters from URL or localStorage
        const params = new URLSearchParams(location.search);
        const fromQS = {
            date_from: params.get('date_from') || '',
            date_to: params.get('date_to') || ''
        };
        const fromLS = JSON.parse(localStorage.getItem('admin_analytics_filters') || 'null');
        const initial = (fromQS.date_from || fromQS.date_to) ? fromQS : (fromLS || { date_from: '', date_to: '' });
        setAnalyticsFilters(initial);

        loadUsers();
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Build query string for filters
            const params = new URLSearchParams();
            if (analyticsFilters.date_from) params.append('date_from', analyticsFilters.date_from);
            if (analyticsFilters.date_to) params.append('date_to', analyticsFilters.date_to);
            const qs = params.toString();
            const data = await fetchAnalytics(qs);
            setAnalytics(data);
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // Draw charts when analytics changes
    useEffect(() => {
        if (!analytics || activeTab !== 'analytics') return;
        // Trend chart
        const trendCtx = document.getElementById('aptTrend');
        const statusCtx = document.getElementById('aptByStatus');
        const userDistCtx = document.getElementById('userDistribution');
        const conditionsBarCtx = document.getElementById('conditionsBar');
        const healthSummaryBarCtx = document.getElementById('healthSummaryBar');
        const sparkUsersCtx = document.getElementById('sparkUsers');
        const sparkAptsCtx = document.getElementById('sparkApts');
        if (!trendCtx || !statusCtx) return;

        // Destroy existing charts on re-render to avoid duplicates
        if (window.__aptTrendChart) {
            window.__aptTrendChart.destroy();
        }
        if (window.__aptStatusChart) {
            window.__aptStatusChart.destroy();
        }
        if (window.__userDistChart) { window.__userDistChart.destroy(); }
        if (window.__conditionsBarChart) { window.__conditionsBarChart.destroy(); }
        if (window.__healthBarChart) { window.__healthBarChart.destroy(); }
        if (window.__sparkUsers) {
            window.__sparkUsers.destroy();
        }
        if (window.__sparkApts) {
            window.__sparkApts.destroy();
        }

        const labels = (analytics.appointments.trend || []).map(p => p.date);
        const values = (analytics.appointments.trend || []).map(p => p.count);
        window.__aptTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Appointments per day',
                    data: values,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13,110,253,0.1)',
                    tension: 0.3,
                    fill: true,
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        const byStatus = analytics.appointments.by_status || [];
        const sLabels = byStatus.map(s => s.status);
        const sValues = byStatus.map(s => s.count);
        window.__aptStatusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: sLabels,
                datasets: [{
                    data: sValues,
                    backgroundColor: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#6c757d']
                }]
            },
            options: {
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = sValues.reduce((a, b) => a + b, 0) || 1;
                                const val = ctx.parsed;
                                const pct = Math.round((val / total) * 100);
                                return `${ctx.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        // User Distribution (Pie)
        if (userDistCtx) {
            const uVals = [analytics.users.patients, analytics.users.doctors, analytics.users.caregivers, analytics.users.admins];
            const uLabels = ['Patients', 'Doctors', 'Caregivers', 'Admins'];
            window.__userDistChart = new Chart(userDistCtx, {
                type: 'pie',
                data: { labels: uLabels, datasets: [{ data: uVals, backgroundColor: ['#0d6efd', '#0dcaf0', '#ffc107', '#dc3545'] }] },
                options: { plugins: { legend: { position: 'bottom' } } }
            });
        }

        // Top Patient Conditions (Horizontal Bar)
        if (conditionsBarCtx && (analytics.insights.top_conditions || []).length > 0) {
            const cLabels = analytics.insights.top_conditions.map(c => c.primary_condition);
            const cVals = analytics.insights.top_conditions.map(c => c.count);
            window.__conditionsBarChart = new Chart(conditionsBarCtx, {
                type: 'bar',
                data: { labels: cLabels, datasets: [{ label: 'Patients', data: cVals, backgroundColor: '#6f42c1' }] },
                options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            });
        }

        // Health Summary (Grouped Bar)
        if (healthSummaryBarCtx) {
            const hLabels = ['Vitals', 'Symptoms', 'Labs'];
            const hVals = [analytics.health.total_vitals, analytics.health.total_symptoms, analytics.health.total_labs];
            window.__healthBarChart = new Chart(healthSummaryBarCtx, {
                type: 'bar',
                data: { labels: hLabels, datasets: [{ label: 'Total', data: hVals, backgroundColor: ['#0d6efd', '#ffc107', '#0dcaf0'] }] },
                options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            });
        }

        // Simple sparklines
        if (sparkUsersCtx) {
            const uTrend = (analytics.users.trend || []);
            const sparkLabels = uTrend.map(p => p.date);
            const sparkData = uTrend.map(p => p.count);
            window.__sparkUsers = new Chart(sparkUsersCtx, {
                type: 'line',
                data: { labels: sparkLabels, datasets: [{ data: sparkData, borderColor: '#20c997', pointRadius: 0 }] },
                options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { tension: 0.3 } } }
            });
        }
        if (sparkAptsCtx) {
            window.__sparkApts = new Chart(sparkAptsCtx, {
                type: 'line',
                data: { labels, datasets: [{ data: values, borderColor: '#0dcaf0', pointRadius: 0 }] },
                options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { tension: 0.3 } } }
            });
        }

        // Cleanup when component unmounts or re-renders
        return () => {
            if (window.__aptTrendChart) window.__aptTrendChart.destroy();
            if (window.__aptStatusChart) window.__aptStatusChart.destroy();
            if (window.__sparkUsers) window.__sparkUsers.destroy();
            if (window.__sparkApts) window.__sparkApts.destroy();
            if (window.__userDistChart) window.__userDistChart.destroy();
            if (window.__conditionsBarChart) window.__conditionsBarChart.destroy();
            if (window.__healthBarChart) window.__healthBarChart.destroy();
        };
    }, [analytics, activeTab]);

    // Reload analytics on filter change
    useEffect(() => {
        if (activeTab === 'analytics') {
            // Persist filters to URL and localStorage
            const params = new URLSearchParams();
            if (analyticsFilters.date_from) params.set('date_from', analyticsFilters.date_from);
            if (analyticsFilters.date_to) params.set('date_to', analyticsFilters.date_to);
            const qs = params.toString();
            navigate({ search: qs ? `?${qs}` : '' }, { replace: true });
            localStorage.setItem('admin_analytics_filters', JSON.stringify(analyticsFilters));

            loadAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analyticsFilters, activeTab]);


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
                                    {/* Filters */}
                                    <Card className="mb-3">
                                        <Card.Body>
                                            <Form>
                                                <Row className="g-2 align-items-end">
                                                    <Col md={3}>
                                                        <Form.Label>From</Form.Label>
                                                        <Form.Control type="date" size="sm" value={analyticsFilters.date_from} onChange={e => setAnalyticsFilters(f => ({ ...f, date_from: e.target.value }))} />
                                                    </Col>
                                                    <Col md={3}>
                                                        <Form.Label>To</Form.Label>
                                                        <Form.Control type="date" size="sm" value={analyticsFilters.date_to} onChange={e => setAnalyticsFilters(f => ({ ...f, date_to: e.target.value }))} />
                                                    </Col>
                                                    {/* Doctor/Patient filters removed */}
                                                </Row>
                                                <Row className="mt-2 g-2 align-items-center">
                                                    <Col md="auto">
                                                        <Button size="sm" variant="outline-primary" onClick={() => {
                                                            const today = new Date().toISOString().slice(0, 10);
                                                            setAnalyticsFilters(f => ({ ...f, date_from: today, date_to: today }));
                                                        }}>Today</Button>
                                                    </Col>
                                                    <Col md="auto">
                                                        <Button size="sm" variant="outline-primary" onClick={() => {
                                                            const today = new Date();
                                                            const from = new Date(today);
                                                            from.setDate(today.getDate() - 6);
                                                            const fmt = (d) => d.toISOString().slice(0, 10);
                                                            setAnalyticsFilters(f => ({ ...f, date_from: fmt(from), date_to: fmt(today) }));
                                                        }}>Last 7 days</Button>
                                                    </Col>
                                                    <Col md="auto">
                                                        <Button size="sm" variant="outline-primary" onClick={() => {
                                                            const today = new Date();
                                                            const from = new Date(today);
                                                            from.setDate(today.getDate() - 29);
                                                            const fmt = (d) => d.toISOString().slice(0, 10);
                                                            setAnalyticsFilters(f => ({ ...f, date_from: fmt(from), date_to: fmt(today) }));
                                                        }}>Last 30 days</Button>
                                                    </Col>
                                                    <Col md="auto">
                                                        <Button size="sm" variant="secondary" onClick={() => setAnalyticsFilters({ date_from: '', date_to: '' })}>Clear</Button>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                    {/* Stats Cards */}
                                    <Row className="mb-4">
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Total Users</h6>
                                                    <div className="d-flex justify-content-center align-items-center gap-2">
                                                        <h2 className="text-primary mb-0">{analytics.users.total}</h2>
                                                        {analytics.users.month ? (
                                                            <Badge bg={(analytics.users.month.delta >= 0) ? 'success' : 'danger'}>
                                                                {(analytics.users.month.delta >= 0 ? '+' : '') + analytics.users.month.delta} vs last month
                                                            </Badge>
                                                        ) : (
                                                            <Badge bg="success">+{analytics.users.recent_registrations} this month</Badge>
                                                        )}
                                                    </div>
                                                    <div className="mt-2">
                                                        <canvas id="sparkUsers" height="30"></canvas>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Total Appointments</h6>
                                                    <div className="d-flex justify-content-center align-items-center gap-2">
                                                        <h2 className="text-info mb-0">{analytics.appointments.total}</h2>
                                                        {analytics.appointments.month && (
                                                            <Badge bg={(analytics.appointments.month.delta >= 0) ? 'success' : 'danger'}>
                                                                {(analytics.appointments.month.delta >= 0 ? '+' : '') + analytics.appointments.month.delta} MTD
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="mt-2">
                                                        <canvas id="sparkApts" height="30"></canvas>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={3}>
                                            <Card className="text-center h-100">
                                                <Card.Body>
                                                    <h6 className="text-muted">Medications</h6>
                                                    <div className="d-flex justify-content-center align-items-center gap-2">
                                                        <h2 className="text-warning mb-0">{analytics.medications.total}</h2>
                                                        {analytics.medications.month && (
                                                            <Badge bg={(analytics.medications.month.delta >= 0) ? 'success' : 'danger'}>
                                                                {(analytics.medications.month.delta >= 0 ? '+' : '') + analytics.medications.month.delta} MTD
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <small className="text-muted d-block mt-1">{analytics.medications.active} active</small>
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

                                    {/* User Distribution and Top Conditions */}
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <Card className="h-100">
                                                <Card.Header><strong>User Distribution</strong></Card.Header>
                                                <Card.Body>
                                                    <canvas id="userDistribution" height="160"></canvas>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="h-100">
                                                <Card.Header><strong>Top Patient Conditions</strong></Card.Header>
                                                <Card.Body>
                                                    {analytics.insights.top_conditions.length > 0 ? (
                                                        <canvas id="conditionsBar" height="200"></canvas>
                                                    ) : (
                                                        <p className="text-muted">No condition data available</p>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Charts Row */}
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <Card className="h-100">
                                                <Card.Header><strong>Appointments Trend</strong></Card.Header>
                                                <Card.Body>
                                                    <canvas id="aptTrend" height="140"></canvas>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="h-100">
                                                <Card.Header><strong>Appointments by Status</strong></Card.Header>
                                                <Card.Body>
                                                    <canvas id="aptByStatus" height="140"></canvas>
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
                                                    <canvas id="healthSummaryBar" height="120"></canvas>
                                                    <div className="d-flex justify-content-center gap-4 mt-3">
                                                        <small className="text-primary">Vitals: {analytics.health.total_vitals} (+{analytics.health.recent_vitals} this week)</small>
                                                        <small className="text-warning">Symptoms: {analytics.health.total_symptoms}</small>
                                                        <small className="text-info">Labs: {analytics.health.total_labs}</small>
                                                    </div>
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
