import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Row, Col, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    listTimesheetEntries,
    deleteTimesheetEntry,
    submitTimesheetWeek,
    clockInTimesheetEntry,
    clockOutTimesheetEntry,
    updateTimesheetEntry
} from '../services/timesheetService';
import { fetchPatientList } from '../services/healthService';

const TimesheetPage = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientsError, setClientsError] = useState(null);
    const [showClockInModal, setShowClockInModal] = useState(false);
    const [clockInData, setClockInData] = useState({ client: '', rate: 2500 });
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [breakEntry, setBreakEntry] = useState(null);

    const fetchEntries = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listTimesheetEntries();
            setEntries(data);
        } catch (err) {
            setError(err.message || 'Failed to load timesheet entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    // Load clients when the clock-in modal opens
    useEffect(() => {
        const loadClients = async () => {
            setClientsLoading(true);
            setClientsError(null);
            try {
                const list = await fetchPatientList();
                // Deduplicate by name to be safe and sort alphabetically
                const mapByName = new Map();
                for (const c of list) {
                    const name = (c.name || '').trim();
                    if (!name) continue;
                    if (!mapByName.has(name)) mapByName.set(name, { label: name, value: name, id: c.id });
                }
                const options = Array.from(mapByName.values()).sort((a, b) => a.label.localeCompare(b.label));
                setClients(options);
            } catch (e) {
                setClientsError(e.message || 'Failed to load clients');
            } finally {
                setClientsLoading(false);
            }
        };

        if (showClockInModal && clients.length === 0 && !clientsLoading && !clientsError) {
            loadClients();
        }
    }, [showClockInModal, clients.length, clientsLoading, clientsError]);

    const handleEdit = (entry) => {
        // Editing draft entries could be added back if needed
        alert('Please clock in/out to track time. Edit functionality coming soon.');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            await deleteTimesheetEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry: ' + (err.message || 'Unknown error'));
        }
    };



    const handleSubmitWeek = async () => {
        const draftEntries = entries.filter(e => e.status === 'draft');
        if (draftEntries.length === 0) {
            alert('No draft entries to submit');
            return;
        }

        if (!window.confirm(`Submit ${draftEntries.length} draft entries for approval?`)) return;

        try {
            const result = await submitTimesheetWeek(draftEntries.map(e => e.id));
            alert(result.message);
            // Refresh entries
            await fetchEntries();
        } catch (err) {
            alert('Failed to submit week: ' + (err.message || 'Unknown error'));
        }
    };

    const weekTotal = entries.reduce((sum, e) => sum + (e.subtotal || 0), 0);
    const draftCount = entries.filter(e => e.status === 'draft').length;
    const activeEntry = entries.find(e => e.status === 'in-progress');

    const handleClockIn = () => {
        if (activeEntry) {
            alert('You already have an active entry in progress.');
            return;
        }
        setClockInData({ client: '', rate: 2500 });
        setShowClockInModal(true);
    };

    const handleClockInSubmit = async () => {
        if (!clockInData.client || !clockInData.rate) {
            alert('Please fill in all required fields');
            return;
        }
        setSaving(true);
        try {
            const entry = await clockInTimesheetEntry(clockInData);
            setEntries(prev => [...prev, entry]);
            setShowClockInModal(false);
        } catch (err) {
            alert('Failed to clock in: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleClockOut = async (entry) => {
        if (!entry || entry.status !== 'in-progress') return;
        if (!window.confirm('Clock out now and finalize this entry?')) return;
        try {
            const updated = await clockOutTimesheetEntry(entry.id);
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        } catch (err) {
            alert('Failed to clock out: ' + (err.message || 'Unknown error'));
        }
    };

    const handleAddBreak = (entry) => {
        setBreakEntry({ ...entry });
        setShowBreakModal(true);
    };

    const handleSaveBreak = async () => {
        if (!breakEntry) return;
        setSaving(true);
        try {
            const updated = await updateTimesheetEntry(breakEntry.id, {
                ...breakEntry,
                status: 'in-progress'
            });
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            setShowBreakModal(false);
            setBreakEntry(null);
        } catch (err) {
            alert('Failed to update break time: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container-fluid py-4">
            <Row className="mb-3">
                <Col>
                    <h2>
                        <FontAwesomeIcon icon="clock" className="me-2" />
                        Weekly Timesheet
                    </h2>
                </Col>
                <Col className="text-end">
                    <Button
                        variant={activeEntry ? 'warning' : 'outline-success'}
                        className="me-2"
                        onClick={activeEntry ? () => handleClockOut(activeEntry) : handleClockIn}
                    >
                        <FontAwesomeIcon icon={activeEntry ? 'sign-out-alt' : 'sign-in-alt'} className="me-1" />
                        {activeEntry ? 'Clock Out' : 'Clock In'}
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSubmitWeek}
                        disabled={draftCount === 0}
                    >
                        <FontAwesomeIcon icon="check" className="me-1" />
                        Submit Week ({draftCount})
                    </Button>
                </Col>
            </Row>
            <Card className="medical-card">
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Loading timesheet...</p>
                        </div>
                    ) : error ? (
                        <Alert variant="danger">
                            <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                            {error}
                        </Alert>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-5">
                            <FontAwesomeIcon icon="calendar-times" size="3x" className="text-muted mb-3" />
                            <h5 className="text-muted">No Timesheet Entries</h5>
                            <p className="text-muted">Click "Add Entry" to create your first timesheet entry.</p>
                        </div>
                    ) : (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Break (min)</th>
                                    <th>Hours</th>
                                    <th>Rate (Ksh)</th>
                                    <th>Subtotal (Ksh)</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.date}</td>
                                        <td>{e.client}</td>
                                        <td>{e.start || '--'}</td>
                                        <td>{e.end || (e.status === 'in-progress' ? '⏳' : '--')}</td>
                                        <td>{e.break}</td>
                                        <td>{e.hours?.toFixed ? e.hours.toFixed(2) : e.hours}</td>
                                        <td>Ksh {e.rate}</td>
                                        <td>Ksh {e.subtotal?.toFixed ? e.subtotal.toFixed(2) : e.subtotal}</td>
                                        <td>
                                            <span className={`badge ${e.status === 'approved' ? 'bg-success' :
                                                e.status === 'submitted' ? 'bg-info' :
                                                    e.status === 'in-progress' ? 'bg-warning text-dark' :
                                                    e.status === 'rejected' ? 'bg-danger' :
                                                        'bg-secondary'
                                                }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td>
                                            {e.status === 'in-progress' ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-info"
                                                        className="me-1"
                                                        onClick={() => handleAddBreak(e)}
                                                        title="Add Break Time"
                                                    >
                                                        <FontAwesomeIcon icon="coffee" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-warning"
                                                        onClick={() => handleClockOut(e)}
                                                        title="Clock Out"
                                                    >
                                                        <FontAwesomeIcon icon="sign-out-alt" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="me-1"
                                                        onClick={() => handleEdit(e)}
                                                        disabled={e.status !== 'draft'}
                                                    >
                                                        <FontAwesomeIcon icon="edit" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => handleDelete(e.id)}
                                                        disabled={e.status !== 'draft'}
                                                    >
                                                        <FontAwesomeIcon icon="trash" />
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="fw-bold">
                                    <td colSpan={7}>Total</td>
                                    <td>Ksh {weekTotal.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Clock In Modal */}
            <Modal show={showClockInModal} onHide={() => setShowClockInModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="sign-in-alt" className="me-2" />
                        Clock In
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Client *</Form.Label>
                            <Form.Select
                                value={clockInData.client}
                                onChange={e => setClockInData(prev => ({ ...prev, client: e.target.value }))}
                                required
                            >
                                <option value="" disabled>
                                    {clientsLoading ? 'Loading clients…' : 'Select a client'}
                                </option>
                                {clients.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Form.Select>
                            {clientsError && (
                                <div className="text-danger small mt-1">{clientsError}</div>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Hourly Rate (Ksh) *</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                step="0.01"
                                value={clockInData.rate}
                                onChange={e => setClockInData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Start Time</Form.Label>
                            <Form.Control
                                type="text"
                                value={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                disabled
                            />
                            <Form.Text className="text-muted">
                                Your shift will start at the current time
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowClockInModal(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleClockInSubmit} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Clocking In...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="sign-in-alt" className="me-2" />
                                Clock In
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Break Time Modal */}
            <Modal show={showBreakModal} onHide={() => setShowBreakModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="coffee" className="me-2" />
                        Add Break Time
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Break Duration (minutes)</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                value={breakEntry?.break || 0}
                                onChange={e => setBreakEntry(prev => ({ ...prev, break: Number(e.target.value) }))}
                            />
                            <Form.Text className="text-muted">
                                Total break time will be deducted from your hours
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBreakModal(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveBreak} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="save" className="me-2" />
                                Save Break
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TimesheetPage;
