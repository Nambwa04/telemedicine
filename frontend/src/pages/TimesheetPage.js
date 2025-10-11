import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Row, Col, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    listTimesheetEntries,
    createTimesheetEntry,
    updateTimesheetEntry,
    deleteTimesheetEntry,
    submitTimesheetWeek
} from '../services/timesheetService';

const TimesheetPage = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [saving, setSaving] = useState(false);

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

    const handleAdd = () => {
        const today = new Date().toISOString().split('T')[0];
        setEditEntry({
            date: today,
            client: '',
            start: '09:00',
            end: '17:00',
            break: 30,
            rate: 25,
            status: 'draft'
        });
        setShowModal(true);
    };

    const handleEdit = (entry) => {
        setEditEntry({ ...entry });
        setShowModal(true);
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

    const handleSave = async () => {
        if (!editEntry.date || !editEntry.client || !editEntry.start || !editEntry.end) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            if (editEntry.id) {
                // Update existing entry
                const updated = await updateTimesheetEntry(editEntry.id, editEntry);
                setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            } else {
                // Create new entry
                const created = await createTimesheetEntry(editEntry);
                setEntries(prev => [...prev, created]);
            }
            setShowModal(false);
            setEditEntry(null);
        } catch (err) {
            alert('Failed to save entry: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
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
                    <Button variant="primary" onClick={handleAdd}>
                        <FontAwesomeIcon icon="plus" className="me-1" />
                        Add Entry
                    </Button>
                    {' '}
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
                                    <th>Rate</th>
                                    <th>Subtotal</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.date}</td>
                                        <td>{e.client}</td>
                                        <td>{e.start}</td>
                                        <td>{e.end}</td>
                                        <td>{e.break}</td>
                                        <td>{e.hours}</td>
                                        <td>${e.rate}</td>
                                        <td>${e.subtotal.toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${e.status === 'approved' ? 'bg-success' :
                                                    e.status === 'submitted' ? 'bg-info' :
                                                        e.status === 'rejected' ? 'bg-danger' :
                                                            'bg-secondary'
                                                }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td>
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
                                        </td>
                                    </tr>
                                ))}
                                <tr className="fw-bold">
                                    <td colSpan={7}>Total</td>
                                    <td>${weekTotal.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editEntry?.id ? (
                            <>
                                <FontAwesomeIcon icon="edit" className="me-2" />
                                Edit Entry
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="plus" className="me-2" />
                                Add Entry
                            </>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Date *</Form.Label>
                            <Form.Control
                                type="date"
                                value={editEntry?.date || ''}
                                onChange={e => setEditEntry(prev => ({ ...prev, date: e.target.value }))}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Client *</Form.Label>
                            <Form.Control
                                type="text"
                                value={editEntry?.client || ''}
                                onChange={e => setEditEntry(prev => ({ ...prev, client: e.target.value }))}
                                placeholder="Client name"
                                required
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Time *</Form.Label>
                                    <Form.Control
                                        type="time"
                                        value={editEntry?.start || ''}
                                        onChange={e => setEditEntry(prev => ({ ...prev, start: e.target.value }))}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Time *</Form.Label>
                                    <Form.Control
                                        type="time"
                                        value={editEntry?.end || ''}
                                        onChange={e => setEditEntry(prev => ({ ...prev, end: e.target.value }))}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Break (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={editEntry?.break || 0}
                                        onChange={e => setEditEntry(prev => ({ ...prev, break: Number(e.target.value) }))}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Hourly Rate ($) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={editEntry?.rate || 0}
                                        onChange={e => setEditEntry(prev => ({ ...prev, rate: Number(e.target.value) }))}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="save" className="me-2" />
                                Save
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TimesheetPage;
