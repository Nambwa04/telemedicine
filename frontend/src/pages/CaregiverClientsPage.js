import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { listCareRequests } from '../services/caregiverService';

const CaregiverClientsPage = () => {
    // Current Clients: get unique clients from accepted/in-progress service requests
    const [currentClients, setCurrentClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [clientsError, setClientsError] = useState(null);

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
                        <Card.Header className="d-flex justify-content-between align-items-center fw-bold text-dark">
                            <span>
                                <FontAwesomeIcon icon="user-friends" className="me-2" />
                                Active Clients
                            </span>
                            <Badge bg="primary" className="soft-badge">
                                {currentClients.length} {currentClients.length === 1 ? 'Client' : 'Clients'}
                            </Badge>
                        </Card.Header>
                        <Card.Body>
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
                            {!clientsLoading && !clientsError && currentClients.length === 0 && (
                                <div className="text-center py-5">
                                    <FontAwesomeIcon icon="user-plus" size="3x" className="text-muted mb-3" />
                                    <h5 className="text-muted">No Active Clients</h5>
                                    <p className="text-muted">Accept service requests to see active clients here.</p>
                                </div>
                            )}
                            {!clientsLoading && !clientsError && currentClients.length > 0 && (
                                <Table hover responsive className="mb-0">
                                    <thead>
                                        <tr>
                                            <th>Client Name</th>
                                            <th>Service</th>
                                            <th>Duration</th>
                                            <th>Rate</th>
                                            <th>Status</th>
                                            <th>Since</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentClients.map(client => (
                                            <tr key={client.id}>
                                                <td className="fw-medium">
                                                    <FontAwesomeIcon icon="user-circle" className="text-primary me-2" />
                                                    {client.name}
                                                </td>
                                                <td><small className="text-muted">{client.service}</small></td>
                                                <td><small className="text-muted">{client.duration}</small></td>
                                                <td className="fw-medium">${client.hourlyRate}/hr</td>
                                                <td>{getStatusBadge(client.status)}</td>
                                                <td>
                                                    <small className="text-muted">
                                                        {client.requestedDate ? new Date(client.requestedDate).toLocaleDateString() : '—'}
                                                    </small>
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
        </Container>
    );
};

export default CaregiverClientsPage;
