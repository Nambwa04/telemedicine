import React, { useEffect, useState, useMemo } from 'react';
import { Card, Container, Row, Col, Table, Button, Form, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { fetchPatientList } from '../services/healthService';
import { getConditionTag } from '../utils/statusStyles';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Shared patient list page for doctor & caregiver roles.
// Doctor sees heading "Patients"; Caregiver sees "Clients".
// Provides search, simple condition badge, and action to open health dashboard.

const PatientListPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [serverQuery, setServerQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Initial load
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const list = await fetchPatientList();
                if (mounted) setPatients(list);
            } catch (e) {
                if (mounted) setError('Failed to load patient list');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Debounced server-side search
    useEffect(() => {
        if (!query.trim()) {
            setServerQuery('');
            return; // rely on initial list
        }
        const handle = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const list = await fetchPatientList(query.trim());
                setPatients(list);
                setServerQuery(query.trim());
            } catch (e) {
                setError('Search failed');
            } finally {
                setSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [query]);

    // When serverQuery active, list already filtered server side; fallback to local filter for empty serverQuery
    const filtered = useMemo(() => {
        if (serverQuery) return patients;
        const q = query.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter(p => p.name.toLowerCase().includes(q));
    }, [patients, query, serverQuery]);

    const openDashboard = (id) => {
        navigate(`/health-dashboard?patientId=${id}`);
    };

    const heading = user?.role === 'caregiver' ? 'Clients' : 'Patients';

    return (
        <Container fluid className="fade-in py-4">
            <Row className="mb-4 align-items-center">
                <Col md={7} className="mb-2 mb-md-0">
                    <h2 className="mb-0 d-flex align-items-center">
                        <FontAwesomeIcon icon="users" className="me-2 text-primary" /> {heading}
                        <Badge bg="primary" className="soft-badge ms-3">{filtered.length}</Badge>
                    </h2>
                </Col>
                <Col md={5}>
                    <InputGroup className="shadow-sm">
                        <InputGroup.Text className="bg-light border-0"><FontAwesomeIcon icon="search" className="text-muted" /></InputGroup.Text>
                        <Form.Control
                            placeholder={`Search ${heading.toLowerCase()}...`}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="border-0"
                            aria-label={`Search ${heading}`}
                        />
                        {query && (
                            <Button variant="outline-secondary" onClick={() => setQuery('')} aria-label="Clear search">Clear</Button>
                        )}
                        {searchLoading && <InputGroup.Text className="bg-transparent border-0"><Spinner animation="border" size="sm" /></InputGroup.Text>}
                    </InputGroup>
                </Col>
            </Row>

            <Card className="medical-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">
                        <FontAwesomeIcon icon="list" className="me-2" /> Directory
                    </span>
                    {!loading && !error && filtered.length > 0 && (
                        <span className="small text-muted">Showing {filtered.length} {heading.toLowerCase()}</span>
                    )}
                </Card.Header>
                <Card.Body className="pt-0">
                    {loading && (
                        <div className="d-flex justify-content-center py-5">
                            <Spinner animation="border" />
                        </div>
                    )}
                    {error && !loading && (
                        <Alert variant="danger" className="mt-3">{error}</Alert>
                    )}
                    {!loading && !error && filtered.length === 0 && (
                        <div className="text-center py-5 text-muted">No {heading.toLowerCase()} found.</div>
                    )}
                    {!loading && !error && filtered.length > 0 && (
                        <div className="table-responsive mt-3">
                            <Table hover className="align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th style={{ minWidth: '200px' }}>Name</th>
                                        <th style={{ minWidth: '180px' }}>Condition</th>
                                        <th className="text-center" style={{ width: '140px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => (
                                        <tr key={p.id}>
                                            <td className="fw-medium">{p.name}</td>
                                            <td>
                                                {p.condition ? (() => {
                                                    const meta = getConditionTag(p.condition);
                                                    return <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>;
                                                })() : <span className="text-muted">—</span>}
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    size="sm"
                                                    className="gradient-primary px-3"
                                                    onClick={() => openDashboard(p.id)}
                                                    aria-label={`Open health dashboard for ${p.name}`}
                                                >
                                                    <FontAwesomeIcon icon="heartbeat" className="me-1" /> Dashboard
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PatientListPage;
