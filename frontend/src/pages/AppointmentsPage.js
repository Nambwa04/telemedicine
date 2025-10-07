import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Modal, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { listAppointments, createAppointment, updateAppointment, cancelAppointment, deleteAppointment } from '../services/appointmentService';
import { fetchPatientList, fetchDoctorList } from '../services/healthService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { getStatusMeta } from '../utils/statusStyles';

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
                <Col><h3><FontAwesomeIcon icon="calendar" className="me-2" />Appointments</h3></Col>
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
                        <Col md={2}>
                            <Button variant="outline-secondary" className="mt-4" onClick={() => { setDateFilter(''); setFilterText(''); }}>Reset</Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

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
