import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { listCareRequests, updateCareRequest, startCareRequest, completeCareRequest } from '../services/caregiverService';

/**
 * CaregiverClientsPage Component
 * 
 * Manages the list of active clients for a caregiver.
 * 
 * Features:
 * - Lists active clients (accepted or in-progress care requests)
 * - Allows searching clients by name
 * - Provides actions to start or complete care requests
 * - Displays client details in a modal
 */
const CaregiverClientsPage = () => {
    // Current Clients: get unique clients from accepted/in-progress service requests
    const [currentClients, setCurrentClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [clientsError, setClientsError] = useState(null);
    const [search, setSearch] = useState('');
    const [actionBusyId, setActionBusyId] = useState(null);
    const [alertMsg, setAlertMsg] = useState(null);
    const [details, setDetails] = useState({ show: false, item: null, loading: false, extra: null });
    // End modal & messaging placeholders removed (unused)

    useEffect(() => {
        let mounted = true;
        async function fetchCurrentClients() {
            setClientsLoading(true);
            setClientsError(null);
            try {
                // Fetch all requests with status accepted or in-progress (active clients)
                const allRequests = await listCareRequests();

                // Filter for active requests (accepted/in-progress) for this caregiver
                const activeStatuses = ['accepted', 'in-progress'];
                const activeRequests = allRequests.filter(req =>
                    activeStatuses.includes(req.status)
                );

                // Extract unique clients from active requests using the family field
                const seen = new Set();
                const clients = activeRequests
                    .filter(req => req.family)
                    .filter(req => {
                        if (seen.has(req.family)) return false;
                        seen.add(req.family);
                        return true;
                    })
                    .map((req, index) => ({
                        id: req.id || index,
                        requestId: req.id,
                        name: req.family,
                        service: req.services?.[0] || req.service || 'General Care',
                        status: req.status,
                        duration: req.duration,
                        hourlyRate: req.hourlyRate,
                        requestedDate: req.requestedDate
                    }));

                if (mounted) setCurrentClients(clients);
            } catch (e) {
                if (mounted) {
                    setClientsError(e.message || 'Failed to load clients');
                    setCurrentClients([]);
                }
            } finally {
                if (mounted) setClientsLoading(false);
            }
        }
        fetchCurrentClients();
        return () => { mounted = false; };
    }, []);

    const getStatusBadge = (status) => {
        const map = {
            completed: { label: 'Completed', className: 'soft-badge bg-success-subtle text-success-emphasis' },
            'in-progress': { label: 'In Progress', className: 'soft-badge bg-warning-subtle text-warning-emphasis' },
            accepted: { label: 'Accepted', className: 'soft-badge bg-info-subtle text-info-emphasis' },
            scheduled: { label: 'Scheduled', className: 'soft-badge bg-primary-subtle text-primary-emphasis' }
        };
        const meta = map[status] || { label: status, className: 'soft-badge bg-secondary-subtle text-secondary-emphasis' };
        return <span className={`badge rounded-pill ${meta.className}`}>{meta.label}</span>;
    };

    // Derived list with search
    const filteredClients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return currentClients;
        return currentClients.filter(c => (c.name || '').toLowerCase().includes(q));
    }, [search, currentClients]);

    const refreshList = async () => {
        setClientsLoading(true);
        setClientsError(null);
        try {
            const allRequests = await listCareRequests();
            const activeStatuses = ['accepted', 'in-progress'];
            const activeRequests = allRequests.filter(req => activeStatuses.includes(req.status));
            const seen = new Set();
            const clients = activeRequests
                .filter(req => req.family)
                .filter(req => { if (seen.has(req.family)) return false; seen.add(req.family); return true; })
                .map((req, index) => ({
                    id: req.id || index,
                    requestId: req.id,
                    name: req.family,
                    service: req.services?.[0] || req.service || 'General Care',
                    status: req.status,
                    duration: req.duration,
                    hourlyRate: req.hourlyRate,
                    requestedDate: req.requestedDate
                }));
            setCurrentClients(clients);
        } catch (e) {
            setClientsError(e.message || 'Failed to load clients');
            setCurrentClients([]);
        } finally {
            setClientsLoading(false);
        }
    };

    const handleStatusChange = async (client, newStatus) => {
        if (!client?.requestId) return;
        if (!window.confirm(`Mark ${client.name} as ${newStatus.replace('-', ' ')}?`)) return;
        setActionBusyId(client.id);
        setAlertMsg(null);
        try {
            let res;
            if (newStatus === 'in-progress') {
                res = await startCareRequest(client.requestId);
            } else if (newStatus === 'completed') {
                res = await completeCareRequest(client.requestId);
            } else {
                // Fallback to generic update for other fields/statuses
                res = await updateCareRequest(client.requestId, { status: newStatus });
            }
            if (!res.success) throw new Error(res.error || 'Update failed');
            await refreshList();
            setAlertMsg({ type: 'success', text: `Client marked as ${newStatus}.` });
        } catch (e) {
            setAlertMsg({ type: 'danger', text: e.message || 'Failed to update status' });
        } finally {
            setActionBusyId(null);
        }
    };

    return (
        <Container fluid className="fade-in">
            {/* Page Header */}
            <div className="dashboard-header mb-4">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="users" className="me-3" />
                            My Clients
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Manage your active client relationships</p>
                    </Col>
                </Row>
            </div>

            {/* Current Clients List */}
            <Row>
                <Col lg={12}>
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-2">
                                <FontAwesomeIcon icon="user-friends" className="me-2" />
                                <span>Active Clients</span>
                                <Badge bg="primary" className="soft-badge">
                                    {filteredClients.length} {filteredClients.length === 1 ? 'Client' : 'Clients'}
                                </Badge>
                            </div>
                            <Form className="d-flex" style={{ maxWidth: 320 }} onSubmit={(e) => e.preventDefault()}>
                                <Form.Control
                                    size="sm"
                                    type="search"
                                    placeholder="Search clients..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </Form>
                        </Card.Header>
                        <Card.Body>
                            {alertMsg && (
                                <Alert variant={alertMsg.type} onClose={() => setAlertMsg(null)} dismissible>
                                    {alertMsg.text}
                                </Alert>
                            )}
                            {clientsLoading && (
                                <div className="text-center py-5">
                                    <FontAwesomeIcon icon="spinner" spin size="2x" className="text-primary mb-3" />
                                    <p className="text-muted">Loading current clients...</p>
                                </div>
                            )}
                            {clientsError && (
                                <div className="alert alert-danger" role="alert">
                                    <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                    {clientsError}
                                </div>
                            )}
                            {!clientsLoading && !clientsError && filteredClients.length === 0 && (
                                <div className="text-center py-5">
                                    <FontAwesomeIcon icon="user-plus" size="3x" className="text-muted mb-3" />
                                    <h5 className="text-muted">No Active Clients</h5>
                                    <p className="text-muted">Accept service requests to see active clients here.</p>
                                </div>
                            )}
                            {!clientsLoading && !clientsError && filteredClients.length > 0 && (
                                <Table hover responsive className="mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Client Name</th>
                                            <th>Service</th>
                                            <th>Duration</th>
                                            <th>Rate</th>
                                            <th>Status</th>
                                            <th>Since</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.map(client => (
                                            <tr key={client.id}>
                                                <td className="fw-medium">
                                                    <FontAwesomeIcon icon="user-circle" className="text-primary me-2" />
                                                    {client.name}
                                                </td>
                                                <td><small className="text-muted">{client.service}</small></td>
                                                <td><small className="text-muted">{client.duration}</small></td>
                                                <td className="fw-medium">Ksh {client.hourlyRate}/hr</td>
                                                <td>{getStatusBadge(client.status)}</td>
                                                <td>
                                                    <small className="text-muted">
                                                        {client.requestedDate ? new Date(client.requestedDate).toLocaleDateString() : '—'}
                                                    </small>
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-inline-flex gap-2">

                                                        <Button
                                                            size="sm"
                                                            variant="outline-secondary"
                                                            onClick={() => setDetails({ show: true, item: client })}
                                                        >
                                                            <FontAwesomeIcon icon="eye" className="me-1" /> Details
                                                        </Button>
                                                        {client.status === 'accepted' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                disabled={actionBusyId === client.id}
                                                                onClick={() => handleStatusChange(client, 'in-progress')}
                                                            >
                                                                {actionBusyId === client.id ? (
                                                                    <><Spinner size="sm" animation="border" className="me-1" />Updating…</>
                                                                ) : (
                                                                    <>Start</>
                                                                )}
                                                            </Button>
                                                        )}
                                                        {client.status !== 'completed' && (
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                disabled={actionBusyId === client.id}
                                                                onClick={() => handleStatusChange(client, 'completed')}
                                                            >
                                                                {actionBusyId === client.id ? (
                                                                    <><Spinner size="sm" animation="border" className="me-1" />Saving…</>
                                                                ) : (
                                                                    <>
                                                                        <FontAwesomeIcon icon="check" className="me-1" /> Complete
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Details Modal */}
            <Modal show={details.show} onHide={() => setDetails({ show: false, item: null })} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon="user-circle" className="me-2" />
                        {details.item?.name || 'Client'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {details.item && (
                        <>
                            <Row className="mb-2">
                                <Col md={6}><strong>Service:</strong> <span className="text-muted">{details.item.service}</span></Col>
                                <Col md={6}><strong>Status:</strong> <span>{getStatusBadge(details.item.status)}</span></Col>
                            </Row>
                            <Row className="mb-2">
                                <Col md={6}><strong>Duration:</strong> <span className="text-muted">{details.item.duration || '—'}</span></Col>
                                <Col md={6}><strong>Rate:</strong> <span className="text-muted">Ksh {details.item.hourlyRate}/hr</span></Col>
                            </Row>
                            <Row>
                                <Col md={12}><strong>Since:</strong> <span className="text-muted">{details.item.requestedDate ? new Date(details.item.requestedDate).toLocaleDateString() : '—'}</span></Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setDetails({ show: false, item: null })}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CaregiverClientsPage;
