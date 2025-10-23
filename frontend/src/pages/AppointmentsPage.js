import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Modal, InputGroup, ButtonGroup, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { listAppointments, createAppointment, updateAppointment, cancelAppointment, deleteAppointment } from '../services/appointmentService';
import { fetchPatientList, fetchDoctorList, fetchDashboardStats } from '../services/healthService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { getStatusMeta } from '../utils/statusStyles';
import MonthCalendar from '../components/Calendar/MonthCalendar';

// Centralized status metadata now managed in utils/statusStyles

const AppointmentsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [pageMeta, setPageMeta] = useState({ count: 0, next: null, previous: null });
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const [form, setForm] = useState({
        date: '',
        time: '',
        patientId: '',
        doctorId: '',
        type: 'Consultation',
        notes: ''
    });

    const canManage = user && (user.role === 'doctor' || user.role === 'caregiver');
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
    const [monthDate, setMonthDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState('');
    const [stats, setStats] = useState(null);

    async function load(targetPage = 1) {
        try {
            setLoading(true);
            const { items, meta } = await listAppointments({ page: targetPage });
            setAppointments(items);
            setPageMeta(meta || { count: items.length, next: null, previous: null });
            if (canManage) {
                const p = await fetchPatientList();
                setPatients(p);
                // Only fetch doctors if user not a doctor (for doctor creation by caregiver)
                if (user?.role !== 'doctor') {
                    const d = await fetchDoctorList();
                    setDoctors(d);
                } else {
                    setDoctors([{ id: user.id, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }]);
                }
            }
        } catch (e) {
            setError('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Load dashboard stats for doctors to enrich UI
        if (user?.role === 'doctor') {
            fetchDashboardStats().then(setStats).catch(() => setStats(null));
        }
    }, [user?.role]);

    const filtered = useMemo(() => {
        return appointments.filter(a => {
            if (dateFilter && a.date !== dateFilter) return false;
            if (filterText) {
                const t = filterText.toLowerCase();
                if (!(
                    a.patientName.toLowerCase().includes(t) ||
                    a.type.toLowerCase().includes(t) ||
                    (a.notes && a.notes.toLowerCase().includes(t))
                )) return false;
            }
            return true;
        });
    }, [appointments, filterText, dateFilter]);

    // Build eventsByDate for the current month view
    const eventsByDate = useMemo(() => {
        const map = {};
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();
        appointments.forEach(a => {
            // Only include in current month grid to avoid clutter
            const [y, m] = a.date.split('-').map(Number);
            if (y === year && (m - 1) === month) {
                map[a.date] = (map[a.date] || 0) + 1;
            }
        });
        return map;
    }, [appointments, monthDate]);

    const appointmentsForSelected = useMemo(() => {
        const target = selectedDate || dateFilter;
        if (!target) return [];
        return appointments.filter(a => a.date === target);
    }, [appointments, selectedDate, dateFilter]);

    const resetForm = () => setForm({ date: '', time: '', patientId: '', doctorId: '', type: 'Consultation', notes: '' });

    const openCreate = () => { resetForm(); setShowModal(true); };

    const onCreate = async (e) => {
        e.preventDefault();
        if (!form.date || !form.time || !form.patientId) return;
        try {
            setSaving(true);
            // patient lookup removed (unused)
            await createAppointment({
                date: form.date,
                time: form.time,
                patientId: Number(form.patientId),
                doctorId: form.doctorId ? Number(form.doctorId) : undefined,
                type: form.type,
                notes: form.notes
            });
            setShowModal(false);
            await load(page);
        } catch (e) {
            // handle error
        } finally { setSaving(false); }
    };

    const changeStatus = async (appt, status) => {
        await updateAppointment(appt.id, { status });
        await load(page);
    };

    const cancel = async (appt) => {
        await cancelAppointment(appt.id);
        await load(page);
    };

    const remove = async (appt) => {
        if (!window.confirm('Delete appointment?')) return;
        await deleteAppointment(appt.id);
        await load(page);
    };

    const viewDashboard = (appt) => {
        navigate(`/health-dashboard?patientId=${appt.patientId}`);
    };

    return (
        <Container className="mt-4">
            <Row className="mb-3">
                <Col>
                    <h3 className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon="calendar" className="text-primary" />
                        Appointments
                    </h3>
                    {user?.role === 'doctor' && stats && (
                        <div className="small text-muted mt-1 d-flex flex-wrap gap-3">
                            <span><FontAwesomeIcon icon="clock" className="me-1 text-info" /> Today: <strong>{stats.todayAppointments}</strong></span>
                            <span><FontAwesomeIcon icon="users" className="me-1 text-success" /> Patients: <strong>{stats.totalPatients}</strong></span>
                            <span><FontAwesomeIcon icon="stethoscope" className="me-1 text-warning" /> In Progress: <strong>{stats.pendingConsutls || stats.pendingConsults}</strong></span>
                            <span><FontAwesomeIcon icon="check-circle" className="me-1 text-secondary" /> Completed Today: <strong>{stats.completedToday}</strong></span>
                        </div>
                    )}
                </Col>
                <Col className="text-end">
                    {canManage && (
                        <Button onClick={openCreate} variant="primary">
                            <FontAwesomeIcon icon="plus" className="me-1" /> New Appointment
                        </Button>
                    )}
                </Col>
            </Row>

            <Card className="mb-3">
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Date</Form.Label>
                                <Form.Control type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Search</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text><FontAwesomeIcon icon="search" /></InputGroup.Text>
                                    <Form.Control placeholder="Patient, type, notes..." value={filterText} onChange={e => setFilterText(e.target.value)} />
                                    {filterText && <Button variant="outline-secondary" onClick={() => setFilterText('')}>Clear</Button>}
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="text-end">
                            <div className="d-inline-flex align-items-center gap-2">
                                <ButtonGroup>
                                    <Button size="sm" variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('calendar')}>
                                        <FontAwesomeIcon icon="calendar" className="me-1" /> Calendar
                                    </Button>
                                    <Button size="sm" variant={viewMode === 'list' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('list')}>
                                        <FontAwesomeIcon icon="list" className="me-1" /> List
                                    </Button>
                                </ButtonGroup>
                                <Button size="sm" variant="outline-secondary" onClick={() => load(page)}>
                                    <FontAwesomeIcon icon="sync" className="me-1" /> Refresh
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {viewMode === 'calendar' ? (
                <Row>
                    <Col lg={8} className="mb-3">
                        <MonthCalendar
                            monthDate={monthDate}
                            eventsByDate={eventsByDate}
                            onSelectDate={(d) => { setSelectedDate(d); setDateFilter(d); }}
                            onPrev={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            onNext={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            titlePrefix={user?.role === 'doctor' ? 'Your patients' : 'Appointments'}
                        />
                    </Col>
                    <Col lg={4} className="mb-3">
                        <Card className="h-100 shadow-sm">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <span>
                                    <FontAwesomeIcon icon="calendar-day" className="me-2 text-primary" />
                                    {selectedDate || dateFilter || 'Pick a date'}
                                </span>
                                {selectedDate || dateFilter ? (
                                    <Badge bg="secondary">{appointmentsForSelected.length}</Badge>
                                ) : null}
                            </Card.Header>
                            <Card.Body>
                                {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
                                {!loading && appointmentsForSelected.length === 0 && (
                                    <div className="text-center text-muted">No appointments for the selected day.</div>
                                )}
                                {!loading && appointmentsForSelected.length > 0 && (
                                    <div className="d-flex flex-column gap-2">
                                        {appointmentsForSelected.map(appt => (
                                            <Card key={appt.id} className="border-0 shadow-sm">
                                                <Card.Body className="py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="fw-semibold">{appt.time} · {appt.type}</div>
                                                            <div className="small text-muted">{appt.patientName}</div>
                                                        </div>
                                                        <div>
                                                            <span className={`badge ${getStatusMeta('appointment', appt.status).badgeClass}`}>
                                                                {getStatusMeta('appointment', appt.status).label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 d-flex gap-2">
                                                        <Button size="sm" variant="outline-primary" onClick={() => viewDashboard(appt)}>
                                                            <FontAwesomeIcon icon="heartbeat" className="me-1" /> View
                                                        </Button>
                                                        {appt.status === 'scheduled' && canManage && (
                                                            <Button size="sm" variant="outline-success" onClick={() => changeStatus(appt, 'in-progress')}>
                                                                <FontAwesomeIcon icon="play" className="me-1" /> Start
                                                            </Button>
                                                        )}
                                                        {appt.status === 'in-progress' && canManage && (
                                                            <Button size="sm" variant="outline-success" onClick={() => changeStatus(appt, 'completed')}>
                                                                <FontAwesomeIcon icon="check" className="me-1" /> Complete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Card>
                    <Card.Body>
                        {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
                        {error && <Alert variant="danger">{error}</Alert>}
                        {!loading && !error && (
                            <Table hover responsive className="align-middle">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Patient</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th style={{ width: '220px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(appt => (
                                        <tr key={appt.id} className={appt.status === 'cancelled' ? 'text-muted' : ''}>
                                            <td>{appt.date}</td>
                                            <td><strong>{appt.time}</strong></td>
                                            <td>{appt.patientName}</td>
                                            <td>{appt.type}</td>
                                            <td>{(() => { const meta = getStatusMeta('appointment', appt.status); return <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>; })()}</td>
                                            <td className="quick-actions">
                                                <button type="button" className="btn-icon me-1" onClick={() => viewDashboard(appt)} title="View Health">
                                                    <FontAwesomeIcon icon="heartbeat" />
                                                </button>
                                                {appt.status === 'scheduled' && canManage && (
                                                    <button type="button" className="btn-icon me-1" onClick={() => changeStatus(appt, 'in-progress')} title="Start">
                                                        <FontAwesomeIcon icon="play" />
                                                    </button>
                                                )}
                                                {appt.status === 'in-progress' && canManage && (
                                                    <button type="button" className="btn-icon me-1" onClick={() => changeStatus(appt, 'completed')} title="Complete">
                                                        <FontAwesomeIcon icon="check" />
                                                    </button>
                                                )}
                                                {appt.status !== 'cancelled' && appt.status !== 'completed' && canManage && (
                                                    <button type="button" className="btn-icon me-1" onClick={() => cancel(appt)} title="Cancel">
                                                        <FontAwesomeIcon icon="ban" />
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button type="button" className="btn-icon" onClick={() => remove(appt)} title="Delete">
                                                        <FontAwesomeIcon icon="trash" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4 text-muted">No appointments match your filters.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            )}

            <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted small">Total: {pageMeta.count}</div>
                <div>
                    <Button size="sm" variant="outline-secondary" className="me-2" disabled={!pageMeta.previous} onClick={() => { if (pageMeta.previous) { setPage(p => Math.max(1, p - 1)); load(page - 1); } }}>Prev</Button>
                    <Button size="sm" variant="outline-secondary" disabled={!pageMeta.next} onClick={() => { if (pageMeta.next) { setPage(p => p + 1); load(page + 1); } }}>Next</Button>
                </div>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Form onSubmit={onCreate}>
                    <Modal.Header closeButton>
                        <Modal.Title>New Appointment</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Date</Form.Label>
                                    <Form.Control type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Time</Form.Label>
                                    <Form.Control type="time" required value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Patient</Form.Label>
                                    <Form.Select required value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}>
                                        <option value="">Select patient...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - {p.condition}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Doctor</Form.Label>
                                    <Form.Select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))} disabled={user?.role === 'doctor'}>
                                        <option value="">{user?.role === 'doctor' ? 'You are assigned' : 'Select doctor...'}</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option>Consultation</option>
                                        <option>Follow-up</option>
                                        <option>Check-up</option>
                                        <option>Urgent</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Notes</Form.Label>
                                    <Form.Control as="textarea" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                        <Button type="submit" disabled={saving} variant="primary">
                            {saving ? <Spinner animation="border" size="sm" className="me-1" /> : <FontAwesomeIcon icon="save" className="me-1" />}Save
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default AppointmentsPage;
