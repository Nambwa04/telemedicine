import React, { useEffect, useState, useMemo } from 'react';
import { Card, Container, Row, Col, Table, Button, Form, Badge, Spinner, Alert, InputGroup, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { fetchPatientList } from '../services/healthService';
import API_BASE from '../config';
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

    // Add Patient Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addPatientLoading, setAddPatientLoading] = useState(false);
    const [addPatientError, setAddPatientError] = useState(null);
    const [addPatientSuccess, setAddPatientSuccess] = useState(null);
    const [newPatient, setNewPatient] = useState({
        email: '',
        first_name: '',
        last_name: ''
    });

    // Update Patient Modal state
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updatePatientLoading, setUpdatePatientLoading] = useState(false);
    const [updatePatientError, setUpdatePatientError] = useState(null);
    const [updatePatientSuccess, setUpdatePatientSuccess] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [updatedPatientData, setUpdatedPatientData] = useState({
        first_name: '',
        last_name: '',
        primary_condition: ''
    });

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

    // Add Patient handler
    const handleAddPatient = async (e) => {
        e.preventDefault();
        setAddPatientLoading(true);
        setAddPatientError(null);
        setAddPatientSuccess(null);
        try {
            // Register patient via backend with default password
            const res = await fetch(`${API_BASE}/accounts/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newPatient.email,
                    password: 'Patient@123',
                    role: 'patient',
                    first_name: newPatient.first_name,
                    last_name: newPatient.last_name,
                    username: newPatient.email.split('@')[0]
                })
            });
            if (!res.ok) {
                let msg = 'Registration failed';
                try {
                    const errText = await res.text();
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.detail) {
                            msg = errJson.detail;
                        } else if (typeof errJson === 'string') {
                            msg = errJson;
                        } else if (typeof errJson === 'object') {
                            msg = Object.entries(errJson)
                                .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
                                .join(' | ');
                        }
                    } catch {
                        msg = errText || msg;
                    }
                } catch (e) {
                    msg = msg + ' (no error details)';
                }
                throw new Error(msg);
            }
            setAddPatientSuccess('Patient added successfully!');
            setNewPatient({ email: '', first_name: '', last_name: '' });
            // Refresh patient list after successful add
            const updatedList = await fetchPatientList();
            setPatients(updatedList);
        } catch (err) {
            setAddPatientError(err.message || 'Failed to add patient.');
        } finally {
            setAddPatientLoading(false);
        }
    };

    // Handle edit patient - open modal with patient data
    const handleEditPatient = (patient) => {
        setSelectedPatient(patient);
        setUpdatedPatientData({
            first_name: patient.first_name || patient.name?.split(' ')[0] || '',
            last_name: patient.last_name || patient.name?.split(' ')[1] || '',
            primary_condition: patient.condition || patient.primary_condition || ''
        });
        setUpdatePatientError(null);
        setUpdatePatientSuccess(null);
        setShowUpdateModal(true);
    };

    // Handle update patient submission
    const handleUpdatePatient = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setUpdatePatientLoading(true);
        setUpdatePatientError(null);
        setUpdatePatientSuccess(null);

        try {
            let token = null;
            if (user && user.access) {
                token = user.access;
            } else if (localStorage.getItem('access')) {
                token = localStorage.getItem('access');
            }

            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE}/accounts/doctor/patients/${selectedPatient.id}/update/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updatedPatientData)
            });

            if (!res.ok) {
                let msg = 'Failed to update patient';
                try {
                    const errData = await res.json();
                    if (errData.detail) {
                        msg = errData.detail;
                    } else if (typeof errData === 'object') {
                        msg = Object.entries(errData)
                            .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(', ') : val}`)
                            .join(' | ');
                    }
                } catch {
                    // Use default message
                }
                throw new Error(msg);
            }

            setUpdatePatientSuccess('Patient information updated successfully!');

            // Refresh patient list
            const updatedList = await fetchPatientList();
            setPatients(updatedList);

            // Close modal after 2 seconds
            setTimeout(() => {
                setShowUpdateModal(false);
                setSelectedPatient(null);
            }, 2000);
        } catch (err) {
            setUpdatePatientError(err.message || 'Failed to update patient');
        } finally {
            setUpdatePatientLoading(false);
        }
    };

    return (
        <Container fluid className="fade-in py-4">
            <Row className="mb-4 align-items-center">
                <Col md={7} className="mb-2 mb-md-0">
                    <h2 className="mb-0 d-flex align-items-center">
                        <FontAwesomeIcon icon="users" className="me-2 text-primary" /> {heading}
                        <Badge bg="primary" className="soft-badge ms-3">{filtered.length}</Badge>
                    </h2>
                </Col>
                <Col md={5} className="d-flex justify-content-end align-items-center">
                    <Button variant="primary" size="sm" className="me-2" onClick={() => { setShowAddModal(true); setAddPatientError(null); setAddPatientSuccess(null); }}>
                        <FontAwesomeIcon icon="user-plus" className="me-2" /> Add New Patient
                    </Button>
                    <InputGroup size="sm" className="shadow-sm" style={{ maxWidth: 300 }}>
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

            {/* Add Patient Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Patient</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddPatient}>
                    <Modal.Body>
                        {addPatientError && <Alert variant="danger">{addPatientError}</Alert>}
                        {addPatientSuccess && <Alert variant="success">{addPatientSuccess}</Alert>}
                        <Form.Group className="mb-3" controlId="addPatientEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" required value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="addPatientFirstName">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control type="text" required value={newPatient.first_name} onChange={e => setNewPatient(p => ({ ...p, first_name: e.target.value }))} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="addPatientLastName">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control type="text" required value={newPatient.last_name} onChange={e => setNewPatient(p => ({ ...p, last_name: e.target.value }))} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={addPatientLoading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={addPatientLoading}>
                            {addPatientLoading ? <Spinner size="sm" animation="border" /> : 'Add Patient'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Update Patient Modal */}
            <Modal show={showUpdateModal} onHide={() => { setShowUpdateModal(false); setUpdatePatientError(null); setUpdatePatientSuccess(null); setSelectedPatient(null); }}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Patient Information</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdatePatient}>
                    <Modal.Body>
                        {updatePatientError && <Alert variant="danger">{updatePatientError}</Alert>}
                        {updatePatientSuccess && <Alert variant="success">{updatePatientSuccess}</Alert>}
                        <Form.Group className="mb-3" controlId="updateFirstName">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={updatedPatientData.first_name}
                                onChange={e => setUpdatedPatientData(d => ({ ...d, first_name: e.target.value }))}
                                placeholder="Enter first name"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="updateLastName">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={updatedPatientData.last_name}
                                onChange={e => setUpdatedPatientData(d => ({ ...d, last_name: e.target.value }))}
                                placeholder="Enter last name"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="updateCondition">
                            <Form.Label>Primary Condition</Form.Label>
                            <Form.Control
                                type="text"
                                value={updatedPatientData.primary_condition}
                                onChange={e => setUpdatedPatientData(d => ({ ...d, primary_condition: e.target.value }))}
                                placeholder="Enter primary condition"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => { setShowUpdateModal(false); setSelectedPatient(null); }}
                            disabled={updatePatientLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={updatePatientLoading}>
                            {updatePatientLoading ? <Spinner size="sm" animation="border" /> : 'Update Patient'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

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
                                        <th className="text-center" style={{ width: '180px' }}>Actions</th>
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
                                                    variant="outline-primary"
                                                    className="me-2"
                                                    onClick={() => handleEditPatient(p)}
                                                    aria-label={`Edit ${p.name}`}
                                                >
                                                    <FontAwesomeIcon icon="edit" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="gradient-primary"
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
