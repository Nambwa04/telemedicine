import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Badge, Modal, Table, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { listCaregivers, listCareRequests, createCareRequest, deleteCareRequest } from '../../services/caregiverService';

const CaregiverMarketplace = ({ userRole = 'patient' }) => {
    const [caregivers, setCaregivers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [selectedCaregiver, setSelectedCaregiver] = useState(null);
    const [modalType, setModalType] = useState('profile'); // 'profile', 'request'

    const [searchFilters, setSearchFilters] = useState({
        searchTerm: '',
        specialization: '',
        maxRate: 7000,
        availability: 'any',
        rating: 0,
        distance: 10
    });

    const [requestForm, setRequestForm] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        duration: 4,
        services: [],
        notes: '',
        urgentCare: false
    });

    const [filteredCaregivers, setFilteredCaregivers] = useState(caregivers);
    const [myLocation, setMyLocation] = useState({ lat: null, lng: null });

    const specializations = [
        'Elder Care', 'Alzheimer Care', 'Physical Therapy', 'Companion Care',
        'Post-Surgery Care', 'Medication Management', 'Mobility Assistance',
        'Light Housekeeping', 'Meal Preparation', 'Personal Care'
    ];

    // Fetch caregivers and requests from backend
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [caregiversData, requestsData] = await Promise.all([
                listCaregivers({
                    search: searchFilters.searchTerm,
                    patient_lat: typeof myLocation.lat === 'number' ? myLocation.lat : undefined,
                    patient_lng: typeof myLocation.lng === 'number' ? myLocation.lng : undefined,
                    max_distance: typeof searchFilters.distance === 'number' ? searchFilters.distance : undefined
                }),
                listCareRequests()
            ]);
            setCaregivers(caregiversData);
            setRequests(requestsData);
        } catch (err) {
            setError('Failed to load data. Please try again.');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, [searchFilters.searchTerm, myLocation.lat, myLocation.lng, searchFilters.distance]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get patient location on mount
    useEffect(() => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => { },
            { enableHighAccuracy: true, maximumAge: 120000, timeout: 8000 }
        );
    }, []);

    useEffect(() => {
        // Filter caregivers based on search criteria
        let filtered = caregivers.filter(caregiver => {
            const searchTerm = searchFilters.searchTerm.toLowerCase();
            const matchesSearch = caregiver.name.toLowerCase().includes(searchTerm) ||
                caregiver.specializations.some(spec => spec.toLowerCase().includes(searchTerm));

            const matchesSpecialization = !searchFilters.specialization ||
                caregiver.specializations.includes(searchFilters.specialization);

            const matchesRate = caregiver.hourlyRate <= searchFilters.maxRate;
            const matchesRating = caregiver.rating >= searchFilters.rating;

            // Distance can sometimes be a string such as 'N/A' or '2.3 miles'.
            // We attempt to parse a leading float; if parse fails (NaN), we treat it as 0 so caregiver isn't excluded.
            let numericDistance = caregiver.distance;
            if (typeof numericDistance === 'string') {
                const match = numericDistance.match(/\d+(\.\d+)?/);
                numericDistance = match ? parseFloat(match[0]) : 0; // default 0 == closest
            }
            if (typeof numericDistance !== 'number' || isNaN(numericDistance)) numericDistance = 0;
            const matchesDistance = numericDistance <= searchFilters.distance;

            return matchesSearch && matchesSpecialization && matchesRate && matchesRating && matchesDistance;
        });

        // Sort by rating and availability
        filtered.sort((a, b) => {
            if (a.availability === 'Available Now' && b.availability !== 'Available Now') return -1;
            if (b.availability === 'Available Now' && a.availability !== 'Available Now') return 1;
            return b.rating - a.rating;
        });

        setFilteredCaregivers(filtered);
    }, [searchFilters, caregivers]);

    const handleViewProfile = (caregiver) => {
        setSelectedCaregiver(caregiver);
        setModalType('profile');
        setShowModal(true);
    };

    const handleRequestService = (caregiver) => {
        setSelectedCaregiver(caregiver);
        setModalType('request');
        setRequestForm({
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            duration: 4,
            services: [],
            notes: '',
            urgentCare: false
        });
        setShowModal(true);
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();

        try {
            const requestData = {
                family: 'Patient Family', // Could be derived from user context
                service: requestForm.services.join(', '),
                services: requestForm.services,
                duration: requestForm.duration,
                hourlyRate: selectedCaregiver.hourlyRate,
                notes: requestForm.notes,
                urgentCare: requestForm.urgentCare
            };

            const result = await createCareRequest(requestData);

            if (result.success) {
                setShowModal(false);
                // Refresh requests
                const updatedRequests = await listCareRequests();
                setRequests(updatedRequests);
                alert('Service request sent successfully!');
            } else {
                alert('Failed to send request: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error submitting request:', err);
            alert('Failed to send request. Please try again.');
        }
    };

    const handleCancelRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to cancel this request?')) return;

        try {
            const result = await deleteCareRequest(requestId);
            if (result.success) {
                setRequests(requests.filter(r => r.id !== requestId));
                alert('Request cancelled successfully');
            } else {
                alert('Failed to cancel request: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error cancelling request:', err);
            alert('Failed to cancel request. Please try again.');
        }
    };

    const getAvailabilityBadge = (availability) => {
        switch (availability) {
            case 'Available Now':
                return <Badge bg="success">{availability}</Badge>;
            case 'Available Tomorrow':
                return <Badge bg="warning">{availability}</Badge>;
            default:
                return <Badge bg="secondary">{availability}</Badge>;
        }
    };

    const getRequestStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge bg="warning">Pending</Badge>;
            case 'accepted':
                return <Badge bg="success">Accepted</Badge>;
            case 'declined':
                return <Badge bg="danger">Declined</Badge>;
            case 'completed':
                return <Badge bg="info">Completed</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <FontAwesomeIcon icon="user-nurse" className="me-2 text-primary" />
                        Caregiver Marketplace
                    </h2>
                    <p className="text-muted">Find qualified caregivers in your area</p>
                </Col>
            </Row>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading caregivers...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                    {error}
                </Alert>
            )}

            {!loading && !error && (
                <>
                    {/* Search and Filters */}
                    <Row className="mb-4">
                        <Col>
                            <Card className="medical-card">
                                <Card.Body>
                                    <Row>
                                        <Col lg={3} md={6} className="mb-3">
                                            <Form.Label>Search</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text>
                                                    <FontAwesomeIcon icon="search" />
                                                </InputGroup.Text>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Search by name or specialty..."
                                                    value={searchFilters.searchTerm}
                                                    onChange={(e) => setSearchFilters({ ...searchFilters, searchTerm: e.target.value })}
                                                />
                                            </InputGroup>
                                        </Col>
                                        <Col lg={2} md={6} className="mb-3">
                                            <Form.Label>Specialization</Form.Label>
                                            <Form.Select
                                                value={searchFilters.specialization}
                                                onChange={(e) => setSearchFilters({ ...searchFilters, specialization: e.target.value })}
                                            >
                                                <option value="">All Specializations</option>
                                                {specializations.map(spec => (
                                                    <option key={spec} value={spec}>{spec}</option>
                                                ))}
                                            </Form.Select>
                                        </Col>
                                        <Col lg={2} md={6} className="mb-3">
                                            <Form.Label>Max Rate: Ksh. {searchFilters.maxRate}/hr</Form.Label>
                                            <Form.Range
                                                min="1000"
                                                max="7000"
                                                value={searchFilters.maxRate}
                                                onChange={(e) => setSearchFilters({ ...searchFilters, maxRate: parseInt(e.target.value) })}
                                            />
                                        </Col>
                                        <Col lg={2} md={6} className="mb-3">
                                            <Form.Label>Min Rating</Form.Label>
                                            <Form.Select
                                                value={searchFilters.rating}
                                                onChange={(e) => setSearchFilters({ ...searchFilters, rating: parseFloat(e.target.value) })}
                                            >
                                                <option value="0">Any Rating</option>
                                                <option value="4.5">4.5+ Stars</option>
                                                <option value="4.0">4.0+ Stars</option>
                                                <option value="3.5">3.5+ Stars</option>
                                            </Form.Select>
                                        </Col>
                                        <Col lg={2} md={6} className="mb-3">
                                            <Form.Label>Distance: {searchFilters.distance} metres</Form.Label>
                                            <Form.Range
                                                min="1"
                                                max="20000"
                                                value={searchFilters.distance}
                                                onChange={(e) => setSearchFilters({ ...searchFilters, distance: parseInt(e.target.value) })}
                                            />
                                        </Col>
                                        <Col lg={1} md={6} className="mb-3 d-flex align-items-end">
                                            <Button
                                                variant="outline-secondary"
                                                onClick={() => setSearchFilters({
                                                    searchTerm: '',
                                                    specialization: '',
                                                    maxRate: 7000,
                                                    availability: 'any',
                                                    rating: 0,
                                                    distance: 10
                                                })}
                                            >
                                                Reset
                                            </Button>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* My Requests */}
                    {requests.length > 0 && (
                        <Row className="mb-4">
                            <Col>
                                <Card className="medical-card">
                                    <Card.Header>
                                        <FontAwesomeIcon icon="clipboard-list" className="me-2" />
                                        My Service Requests ({requests.length})
                                    </Card.Header>
                                    <Card.Body>
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Caregiver</th>
                                                    <th>Date</th>
                                                    <th>Services</th>
                                                    <th>Cost</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {requests.map(request => {
                                                    const caregiver = caregivers.find(c => c.id === request.caregiverId);
                                                    return (
                                                        <tr key={request.id}>
                                                            <td>
                                                                <div>
                                                                    <strong>{caregiver?.name}</strong>
                                                                    <div className="small text-muted">{caregiver?.specializations[0]}</div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {request.requestedDate.toLocaleDateString()}
                                                                <div className="small text-muted">{request.duration}</div>
                                                            </td>
                                                            <td>
                                                                {request.services.map(service => (
                                                                    <Badge key={service} bg="light" text="dark" className="me-1">
                                                                        {service}
                                                                    </Badge>
                                                                ))}
                                                            </td>
                                                            <td>
                                                                <strong>Ksh {request.totalCost}</strong>
                                                                <div className="small text-muted">Ksh {request.hourlyRate}/hr</div>
                                                            </td>
                                                            <td>{getRequestStatusBadge(request.status)}</td>
                                                            <td>
                                                                <Button size="sm" variant="outline-primary" className="me-1">
                                                                    <FontAwesomeIcon icon="eye" />
                                                                </Button>
                                                                {request.status === 'pending' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-danger"
                                                                        onClick={() => handleCancelRequest(request.id)}
                                                                    >
                                                                        <FontAwesomeIcon icon="times" />
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Caregivers Grid */}
                    <Row>
                        <Col>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4>Available Caregivers ({filteredCaregivers.length})</h4>
                                <Form.Select style={{ width: 'auto' }}>
                                    <option>Sort by: Best Match</option>
                                    <option>Sort by: Rating</option>
                                    <option>Sort by: Price (Low to High)</option>
                                    <option>Sort by: Price (High to Low)</option>
                                    <option>Sort by: Distance</option>
                                </Form.Select>
                            </div>

                            {filteredCaregivers.length === 0 ? (
                                <Card className="medical-card text-center p-5">
                                    <FontAwesomeIcon icon="search" size="3x" className="text-muted mb-3" />
                                    <h5 className="text-muted">No caregivers found</h5>
                                    <p className="text-muted">Try adjusting your search criteria</p>
                                </Card>
                            ) : (
                                <Row>
                                    {filteredCaregivers.map(caregiver => (
                                        <Col lg={6} xl={4} className="mb-4" key={caregiver.id}>
                                            <Card className="medical-card h-100 caregiver-card">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="d-flex align-items-center">
                                                            <div className="caregiver-avatar me-3">
                                                                <FontAwesomeIcon icon="user-circle" size="3x" className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-1">
                                                                    {caregiver.name}
                                                                    {caregiver.verified && (
                                                                        <FontAwesomeIcon icon="check-circle" className="text-success ms-2" title="Verified" />
                                                                    )}
                                                                </h6>
                                                                <div className="mb-1">
                                                                    <FontAwesomeIcon icon="star" className="text-warning me-1" />
                                                                    <strong>{caregiver.rating}</strong>
                                                                    <span className="text-muted"> ({caregiver.reviewCount} reviews)</span>
                                                                </div>
                                                                <small className="text-muted">{caregiver.experience} years experience</small>
                                                            </div>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className="h5 text-primary mb-1">Ksh {caregiver.hourlyRate}/hr</div>
                                                            {getAvailabilityBadge(caregiver.availability)}
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <div className="small text-muted mb-1">
                                                            <FontAwesomeIcon icon="map-marker-alt" className="me-1" />
                                                            {caregiver.location} • {typeof caregiver.distance === 'number' ? `${Math.round(caregiver.distance)} m` : caregiver.distance}
                                                        </div>
                                                        <div className="small text-muted">
                                                            <FontAwesomeIcon icon="briefcase" className="me-1" />
                                                            {caregiver.completedJobs} completed jobs
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <h6>Specializations:</h6>
                                                        <div>
                                                            {caregiver.specializations.slice(0, 3).map(spec => (
                                                                <Badge key={spec} bg="light" text="dark" className="me-1 mb-1">
                                                                    {spec}
                                                                </Badge>
                                                            ))}
                                                            {caregiver.specializations.length > 3 && (
                                                                <Badge bg="secondary" className="mb-1">
                                                                    +{caregiver.specializations.length - 3} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <h6>Certifications:</h6>
                                                        <div>
                                                            {caregiver.certifications.map(cert => (
                                                                <Badge key={cert} bg="primary" className="me-1 mb-1">
                                                                    {cert}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <p className="text-muted small mb-3">{caregiver.description}</p>

                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="flex-grow-1"
                                                            onClick={() => handleViewProfile(caregiver)}
                                                        >
                                                            <FontAwesomeIcon icon="user" className="me-1" />
                                                            View Profile
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="flex-grow-1"
                                                            onClick={() => handleRequestService(caregiver)}
                                                        >
                                                            <FontAwesomeIcon icon="paper-plane" className="me-1" />
                                                            Request Service
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </Col>
                    </Row>

                    {/* Caregiver Profile/Request Modal */}
                    <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                        <Modal.Header closeButton>
                            <Modal.Title>
                                <FontAwesomeIcon
                                    icon={modalType === 'profile' ? 'user' : 'paper-plane'}
                                    className="me-2"
                                />
                                {modalType === 'profile' ? 'Caregiver Profile' : 'Request Service'}
                            </Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            {modalType === 'profile' && selectedCaregiver && (
                                <Row>
                                    <Col md={4} className="text-center mb-3">
                                        <FontAwesomeIcon icon="user-circle" size="5x" className="text-primary mb-3" />
                                        <h5>{selectedCaregiver.name}</h5>
                                        <p className="text-muted">{selectedCaregiver.experience} years experience</p>
                                        <div className="mb-2">
                                            <FontAwesomeIcon icon="star" className="text-warning me-1" />
                                            <strong>{selectedCaregiver.rating}</strong>
                                            <span className="text-muted"> ({selectedCaregiver.reviewCount} reviews)</span>
                                        </div>
                                        <div className="h4 text-primary">Ksh {selectedCaregiver.hourlyRate}/hr</div>
                                    </Col>
                                    <Col md={8}>
                                        <ListGroup variant="flush">
                                            <ListGroup.Item>
                                                <strong>Location:</strong> {selectedCaregiver.location} ({selectedCaregiver.distance})
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Availability:</strong> {getAvailabilityBadge(selectedCaregiver.availability)}
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Languages:</strong> {selectedCaregiver.languages.join(', ')}
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Specializations:</strong>
                                                <div className="mt-1">
                                                    {selectedCaregiver.specializations.map(spec => (
                                                        <Badge key={spec} bg="light" text="dark" className="me-1 mb-1">
                                                            {spec}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Certifications:</strong>
                                                <div className="mt-1">
                                                    {selectedCaregiver.certifications.map(cert => (
                                                        <Badge key={cert} bg="primary" className="me-1 mb-1">
                                                            {cert}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Description:</strong>
                                                <p className="mb-0 mt-1">{selectedCaregiver.description}</p>
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </Col>
                                </Row>
                            )}

                            {modalType === 'request' && selectedCaregiver && (
                                <Form onSubmit={handleSubmitRequest}>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Service Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    value={requestForm.date}
                                                    onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Start Time</Form.Label>
                                                <Form.Control
                                                    type="time"
                                                    value={requestForm.startTime}
                                                    onChange={(e) => setRequestForm({ ...requestForm, startTime: e.target.value })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Duration (hours)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="12"
                                                    value={requestForm.duration}
                                                    onChange={(e) => setRequestForm({ ...requestForm, duration: parseInt(e.target.value) })}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Estimated Cost</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={`Ksh ${selectedCaregiver.hourlyRate * requestForm.duration}`}
                                                    readOnly
                                                    className="bg-light"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Required Services</Form.Label>
                                                <div>
                                                    {selectedCaregiver.specializations.map(service => (
                                                        <Form.Check
                                                            key={service}
                                                            type="checkbox"
                                                            id={`service-${service}`}
                                                            label={service}
                                                            checked={requestForm.services.includes(service)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setRequestForm({
                                                                        ...requestForm,
                                                                        services: [...requestForm.services, service]
                                                                    });
                                                                } else {
                                                                    setRequestForm({
                                                                        ...requestForm,
                                                                        services: requestForm.services.filter(s => s !== service)
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Additional Notes</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    value={requestForm.notes}
                                                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                                                    placeholder="Any special requirements or additional information..."
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Check
                                                type="checkbox"
                                                id="urgent-care"
                                                label="This is urgent care (may incur additional fees)"
                                                checked={requestForm.urgentCare}
                                                onChange={(e) => setRequestForm({ ...requestForm, urgentCare: e.target.checked })}
                                            />
                                        </Col>
                                    </Row>
                                </Form>
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                Close
                            </Button>
                            {modalType === 'request' && (
                                <Button type="submit" variant="primary" onClick={handleSubmitRequest}>
                                    <FontAwesomeIcon icon="paper-plane" className="me-2" />
                                    Send Request
                                </Button>
                            )}
                        </Modal.Footer>
                    </Modal>
                </>
            )}

            <style jsx>{`
        .caregiver-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .caregiver-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        
        .caregiver-avatar {
          flex-shrink: 0;
        }
      `}</style>
        </Container>
    );
};

export default CaregiverMarketplace;