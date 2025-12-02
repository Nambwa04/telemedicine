import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { listDoctorRequests, acceptDoctorRequest, declineDoctorRequest } from '../services/doctorService';

/**
 * AssignmentRequests Component
 * 
 * Manages patient assignment requests for doctors.
 * 
 * Features:
 * - Lists pending, accepted, and declined assignment requests
 * - Allows doctors to accept or decline requests
 * - Displays request details including patient info, reason, symptoms, and preferred time
 * - Provides filtering by request status
 */
const AssignmentRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('new');
    const [alert, setAlert] = useState(null);

    // Fetch doctor assignment requests
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = filterStatus !== 'all' ? { status: filterStatus, ordering: '-created_at' } : { ordering: '-created_at' };
            const data = await listDoctorRequests(params);
            setRequests(data);
        } catch (err) {
            console.error('Failed to fetch assignment requests:', err);
            setError('Failed to load assignment requests. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Handle accepting a request
    const handleAccept = async (requestId, patientName) => {
        if (!window.confirm(`Are you sure you want to accept the assignment request from ${patientName}?`)) {
            return;
        }

        const result = await acceptDoctorRequest(requestId);
        if (result.success) {
            setAlert({
                type: 'success',
                message: `Successfully accepted assignment request from ${patientName}. The patient is now assigned to you.`
            });
            fetchRequests(); // Refresh the list
        } else {
            setAlert({
                type: 'danger',
                message: `Failed to accept request: ${result.error}`
            });
        }
    };

    // Handle declining a request
    const handleDecline = async (requestId, patientName) => {
        if (!window.confirm(`Are you sure you want to decline the assignment request from ${patientName}?`)) {
            return;
        }

        const result = await declineDoctorRequest(requestId);
        if (result.success) {
            setAlert({
                type: 'info',
                message: `Declined assignment request from ${patientName}.`
            });
            fetchRequests(); // Refresh the list
        } else {
            setAlert({
                type: 'danger',
                message: `Failed to decline request: ${result.error}`
            });
        }
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        const statusMap = {
            new: { bg: 'primary', text: 'New' },
            accepted: { bg: 'success', text: 'Accepted' },
            declined: { bg: 'danger', text: 'Declined' },
            cancelled: { bg: 'secondary', text: 'Cancelled' }
        };
        return statusMap[status] || { bg: 'secondary', text: status };
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">
                        <FontAwesomeIcon icon="user-plus" className="me-2 text-primary" />
                        Patient Assignment Requests
                    </h2>
                    <p className="text-muted mb-0">
                        Manage patient assignment requests and grow your patient base
                    </p>
                </div>
            </div>

            {alert && (
                <Alert
                    variant={alert.type}
                    dismissible
                    onClose={() => setAlert(null)}
                    className="mb-3"
                >
                    {alert.message}
                </Alert>
            )}

            {/* Filter Tabs */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex gap-2 flex-wrap">
                        <Button
                            variant={filterStatus === 'new' ? 'primary' : 'outline-primary'}
                            size="sm"
                            onClick={() => setFilterStatus('new')}
                        >
                            <FontAwesomeIcon icon="clock" className="me-1" />
                            Pending ({requests.filter(r => r.status === 'new').length})
                        </Button>
                        <Button
                            variant={filterStatus === 'accepted' ? 'success' : 'outline-success'}
                            size="sm"
                            onClick={() => setFilterStatus('accepted')}
                        >
                            <FontAwesomeIcon icon="check" className="me-1" />
                            Accepted
                        </Button>
                        <Button
                            variant={filterStatus === 'declined' ? 'danger' : 'outline-danger'}
                            size="sm"
                            onClick={() => setFilterStatus('declined')}
                        >
                            <FontAwesomeIcon icon="times" className="me-1" />
                            Declined
                        </Button>
                        <Button
                            variant={filterStatus === 'all' ? 'secondary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => setFilterStatus('all')}
                        >
                            <FontAwesomeIcon icon="list" className="me-1" />
                            All Requests
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p className="text-muted mt-3">Loading assignment requests...</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <Alert variant="danger">
                    <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                    {error}
                </Alert>
            )}

            {/* Empty State */}
            {!loading && !error && requests.length === 0 && (
                <Card className="text-center py-5">
                    <Card.Body>
                        <FontAwesomeIcon icon="inbox" size="3x" className="text-muted mb-3" />
                        <h4 className="text-muted">No {filterStatus !== 'all' ? filterStatus : ''} requests</h4>
                        <p className="text-muted">
                            {filterStatus === 'new'
                                ? "You don't have any pending assignment requests at the moment."
                                : `No ${filterStatus} requests found.`
                            }
                        </p>
                    </Card.Body>
                </Card>
            )}

            {/* Requests Grid */}
            {!loading && !error && requests.length > 0 && (
                <Row>
                    {requests.map(request => {
                        const statusBadge = getStatusBadge(request.status);

                        return (
                            <Col md={6} lg={4} key={request.id} className="mb-4">
                                <Card className="h-100 shadow-sm">
                                    <Card.Body>
                                        {/* Header with Patient Info */}
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center mb-1">
                                                    <FontAwesomeIcon icon="user" className="text-primary me-2" />
                                                    <h5 className="mb-0">{request.patientName}</h5>
                                                </div>
                                                <small className="text-muted">{request.patientEmail}</small>
                                            </div>
                                            <div className="text-end">
                                                <Badge bg={statusBadge.bg} className="mb-1">
                                                    {statusBadge.text}
                                                </Badge>
                                                {request.urgent && (
                                                    <Badge bg="danger" className="d-block">
                                                        <FontAwesomeIcon icon="exclamation-triangle" className="me-1" />
                                                        Urgent
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="mb-3">
                                            <strong className="small text-muted">Reason:</strong>
                                            <p className="mb-0">{request.reason}</p>
                                        </div>

                                        {/* Symptoms */}
                                        {request.symptoms && (
                                            <div className="mb-3">
                                                <strong className="small text-muted">Symptoms:</strong>
                                                <p className="mb-0 small">{request.symptoms}</p>
                                            </div>
                                        )}

                                        {/* Preferred Date/Time */}
                                        {request.preferredDate && (
                                            <div className="mb-3">
                                                <small className="text-muted">
                                                    <FontAwesomeIcon icon="calendar" className="me-2" />
                                                    {new Date(request.preferredDate).toLocaleDateString()}
                                                    {request.preferredTime && ` at ${request.preferredTime}`}
                                                </small>
                                            </div>
                                        )}

                                        {/* Additional Notes */}
                                        {request.notes && (
                                            <div className="mb-3">
                                                <strong className="small text-muted">Notes:</strong>
                                                <p className="mb-0 small text-muted">{request.notes}</p>
                                            </div>
                                        )}

                                        {/* Request Timestamp */}
                                        <div className="mb-3">
                                            <small className="text-muted">
                                                <FontAwesomeIcon icon="clock" className="me-2" />
                                                Requested {new Date(request.createdAt).toLocaleDateString()} at{' '}
                                                {new Date(request.createdAt).toLocaleTimeString()}
                                            </small>
                                        </div>

                                        {/* Action Buttons */}
                                        {request.status === 'new' && (
                                            <div className="d-flex gap-2 mt-3">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    className="flex-fill"
                                                    onClick={() => handleAccept(request.id, request.patientName)}
                                                    disabled={!request.canAccept}
                                                >
                                                    <FontAwesomeIcon icon="check" className="me-1" />
                                                    Accept
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="flex-fill"
                                                    onClick={() => handleDecline(request.id, request.patientName)}
                                                    disabled={!request.canDecline}
                                                >
                                                    <FontAwesomeIcon icon="times" className="me-1" />
                                                    Decline
                                                </Button>
                                            </div>
                                        )}

                                        {/* Status Messages for Accepted/Declined */}
                                        {request.status === 'accepted' && (
                                            <Alert variant="success" className="mb-0 mt-3 py-2">
                                                <small>
                                                    <FontAwesomeIcon icon="check-circle" className="me-1" />
                                                    You accepted this request
                                                </small>
                                            </Alert>
                                        )}
                                        {request.status === 'declined' && (
                                            <Alert variant="danger" className="mb-0 mt-3 py-2">
                                                <small>
                                                    <FontAwesomeIcon icon="times-circle" className="me-1" />
                                                    You declined this request
                                                </small>
                                            </Alert>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </Container>
    );
};

export default AssignmentRequests;
