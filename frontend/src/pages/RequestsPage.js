import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { listRequests, updateRequestStatus, deleteRequest } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getStatusMeta } from '../utils/statusStyles';

/**
 * RequestsPage Component
 * 
 * Manages service requests for caregivers.
 * Allows viewing, filtering, and updating the status of service requests.
 * 
 * @component
 * @returns {JSX.Element} The rendered RequestsPage component.
 */
const RequestsPage = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState({}); // map of id->boolean

    const isCaregiver = user?.role === 'caregiver';

    /**
     * Loads the list of requests based on the current status filter.
     */
    async function load() {
        try {
            setLoading(true);
            const data = await listRequests({ status: statusFilter });
            setRequests(data);
        } catch (e) {
            setError('Failed to load requests');
        } finally { setLoading(false); }
    }

    useEffect(() => {
        load(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const filtered = useMemo(() => {
        if (!search.trim()) return requests;
        const q = search.toLowerCase();
        return requests.filter(r => (
            r.family.toLowerCase().includes(q) ||
            r.service.toLowerCase().includes(q) ||
            (r.notes && r.notes.toLowerCase().includes(q))
        ));
    }, [requests, search]);

    /**
     * Updates the status of a request.
     * 
     * @param {Object} req - The request object.
     * @param {string} status - The new status.
     */
    const setStatus = async (req, status) => {
        setUpdating(u => ({ ...u, [req.id]: true }));
        try {
            await updateRequestStatus(req.id, status);
            await load();
        } catch (e) { /* handle error (toast later) */ }
        finally { setUpdating(u => ({ ...u, [req.id]: false })); }
    };

    /**
     * Deletes a request.
     * 
     * @param {Object} req - The request object to delete.
     */
    const remove = async (req) => {
        if (!window.confirm('Delete this request?')) return;
        setUpdating(u => ({ ...u, [req.id]: true }));
        try { await deleteRequest(req.id); await load(); } catch (e) { /* ignore */ }
        finally { setUpdating(u => ({ ...u, [req.id]: false })); }
    };

    return (
        <Container className="mt-4">
            <Row className="mb-3 align-items-end">
                <Col>
                    <h3 className="mb-0"><FontAwesomeIcon icon="clipboard-list" className="me-2" />Service Requests</h3>
                    <small className="text-muted">Manage and respond to client service requests</small>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="small mb-1">Status</Form.Label>
                        <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="all">All</option>
                            <option value="new">New</option>
                            <option value="accepted">Accepted</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label className="small mb-1">Search</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><FontAwesomeIcon icon="search" /></InputGroup.Text>
                            <Form.Control placeholder="Family, service, notes..." value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <Button variant="outline-secondary" onClick={() => setSearch('')}>Clear</Button>}
                        </InputGroup>
                    </Form.Group>
                </Col>
            </Row>

            <Card>
                <Card.Body>
                    {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!loading && !error && (
                        <Table hover responsive className="align-middle">
                            <thead>
                                <tr>
                                    <th>Family</th>
                                    <th>Service</th>
                                    <th>Duration</th>
                                    <th>Rate (Ksh)</th>
                                    <th>Status</th>
                                    <th style={{ width: '260px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(req => (
                                    <tr key={req.id} className={req.status === 'declined' ? 'text-muted' : ''}>
                                        <td className="fw-semibold">{req.family} {req.urgent && <span className="badge badge-soft-danger ms-1">Urgent</span>}</td>
                                        <td>{req.service}</td>
                                        <td>{req.duration}</td>
                                        <td>Ksh {req.rate}/{req.unit}</td>
                                        <td>{(() => { const meta = getStatusMeta('request', req.status); return <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>; })()}</td>
                                        <td className="quick-actions">
                                            {req.status === 'new' && isCaregiver && (
                                                <>
                                                    <button type="button" className="btn-icon me-1" disabled={!!updating[req.id]} onClick={() => setStatus(req, 'accepted')} title="Accept">
                                                        <FontAwesomeIcon icon="check" />
                                                    </button>
                                                    <button type="button" className="btn-icon me-1" disabled={!!updating[req.id]} onClick={() => setStatus(req, 'declined')} title="Decline">
                                                        <FontAwesomeIcon icon="times" />
                                                    </button>
                                                </>
                                            )}
                                            {req.status === 'accepted' && (
                                                <button type="button" className="btn-icon me-1" disabled={!!updating[req.id]} onClick={() => setStatus(req, 'in-progress')} title="Start">
                                                    <FontAwesomeIcon icon="play" />
                                                </button>
                                            )}
                                            {req.status === 'in-progress' && (
                                                <button type="button" className="btn-icon me-1" disabled={!!updating[req.id]} onClick={() => setStatus(req, 'completed')} title="Complete">
                                                    <FontAwesomeIcon icon="flag-checkered" />
                                                </button>
                                            )}
                                            {req.status === 'completed' && (
                                                <button type="button" className="btn-icon me-1" disabled title="Done">
                                                    <FontAwesomeIcon icon="check" />
                                                </button>
                                            )}
                                            <button type="button" className="btn-icon me-1" title="Details" disabled={!!updating[req.id]}>
                                                <FontAwesomeIcon icon="info-circle" />
                                            </button>
                                            <button type="button" className="btn-icon" disabled={!!updating[req.id]} onClick={() => remove(req)} title="Delete">
                                                <FontAwesomeIcon icon="trash" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4 text-muted">No requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RequestsPage;
