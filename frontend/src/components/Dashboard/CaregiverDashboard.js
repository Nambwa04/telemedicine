import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';

const CaregiverDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        activeClients: 12,
        todaySchedule: 4,
        pendingRequests: 6,
        monthlyEarnings: 2450
    });

    const [todaySchedule, setTodaySchedule] = useState([
        { id: 1, time: '08:00 AM', client: 'Mrs. Anderson', service: 'Personal Care', location: '123 Oak St', status: 'completed' },
        { id: 2, time: '10:00 AM', client: 'Mr. Thompson', service: 'Medication Management', location: '456 Pine Ave', status: 'in-progress' },
        { id: 3, time: '02:00 PM', client: 'Mrs. Garcia', service: 'Companionship', location: '789 Maple Dr', status: 'scheduled' },
        { id: 4, time: '04:00 PM', client: 'Mr. Davis', service: 'Physical Therapy', location: '321 Elm St', status: 'scheduled' }
    ]);

    const [serviceRequests, setServiceRequests] = useState([
        { id: 1, client: 'Johnson Family', service: 'Elder Care', duration: '3 months', rate: '$25/hour', urgent: true },
        { id: 2, client: 'Brown Family', service: 'Post-Surgery Care', duration: '2 weeks', rate: '$30/hour', urgent: false },
        { id: 3, client: 'Wilson Family', service: 'Companion Care', duration: '6 months', rate: '$22/hour', urgent: false }
    ]);

    const [recentMessages, setRecentMessages] = useState([
        { id: 1, from: 'Mrs. Anderson', message: 'Thank you for the excellent care yesterday!', time: '2 hours ago' },
        { id: 2, from: 'Thompson Family', message: 'Can we reschedule tomorrow\'s appointment?', time: '4 hours ago' },
        { id: 3, from: 'Care Coordinator', message: 'New client match available in your area', time: '1 day ago' }
    ]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <Badge bg="success">Completed</Badge>;
            case 'in-progress':
                return <Badge bg="warning">In Progress</Badge>;
            case 'scheduled':
                return <Badge bg="primary">Scheduled</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-nurse" className="me-3" />
                            Welcome back, {user.name}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Making a difference in people's lives</p>
                    </Col>
                </Row>
            </div>

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="users" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.activeClients}</span>
                            <div className="stat-label">Active Clients</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="calendar-day" className="text-success mb-3" size="2x" />
                            <span className="stat-number">{stats.todaySchedule}</span>
                            <div className="stat-label">Today's Schedule</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="clipboard-list" className="text-warning mb-3" size="2x" />
                            <span className="stat-number">{stats.pendingRequests}</span>
                            <div className="stat-label">Service Requests</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="dollar-sign" className="text-info mb-3" size="2x" />
                            <span className="stat-number">${stats.monthlyEarnings}</span>
                            <div className="stat-label">This Month</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Today's Schedule */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Today's Schedule
                            </span>
                            <Button size="sm" variant="outline-primary">
                                <FontAwesomeIcon icon="route" className="me-1" />
                                View Route
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Client</th>
                                        <th>Service</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todaySchedule.map((appointment) => (
                                        <tr key={appointment.id}>
                                            <td className="fw-bold">{appointment.time}</td>
                                            <td>{appointment.client}</td>
                                            <td>{appointment.service}</td>
                                            <td>
                                                <small>{appointment.location}</small>
                                            </td>
                                            <td>{getStatusBadge(appointment.status)}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary" className="me-1">
                                                    <FontAwesomeIcon icon="map-marker-alt" />
                                                </Button>
                                                <Button size="sm" variant="outline-success">
                                                    <FontAwesomeIcon icon="phone" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Messages */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="comments" className="me-2" />
                            Recent Messages
                        </Card.Header>
                        <Card.Body>
                            {recentMessages.map((message) => (
                                <div key={message.id} className="d-flex align-items-start mb-3 p-2 rounded bg-light">
                                    <div className="me-2">
                                        <FontAwesomeIcon icon="user-circle" className="text-primary" size="lg" />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold small">{message.from}</div>
                                        <p className="mb-1 small">{message.message}</p>
                                        <small className="text-muted">{message.time}</small>
                                    </div>
                                </div>
                            ))}
                            <Button variant="link" className="p-0 text-primary">
                                View all messages
                                <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Service Requests */}
                <Col lg={8} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="clipboard-list" className="me-2" />
                            New Service Requests
                        </Card.Header>
                        <Card.Body>
                            {serviceRequests.map((request) => (
                                <Card key={request.id} className="mb-3 border">
                                    <Card.Body>
                                        <Row className="align-items-center">
                                            <Col md={8}>
                                                <div className="d-flex align-items-center mb-2">
                                                    <h6 className="mb-0 me-2">{request.client}</h6>
                                                    {request.urgent && (
                                                        <Badge bg="danger" className="small">Urgent</Badge>
                                                    )}
                                                </div>
                                                <p className="mb-1"><strong>Service:</strong> {request.service}</p>
                                                <p className="mb-1"><strong>Duration:</strong> {request.duration}</p>
                                                <p className="mb-0"><strong>Rate:</strong> {request.rate}</p>
                                            </Col>
                                            <Col md={4} className="text-end">
                                                <Button variant="success" className="me-2">
                                                    <FontAwesomeIcon icon="check" className="me-1" />
                                                    Accept
                                                </Button>
                                                <Button variant="outline-secondary">
                                                    <FontAwesomeIcon icon="times" className="me-1" />
                                                    Decline
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Quick Actions & Profile */}
                <Col lg={4} className="mb-4">
                    {/* Quick Actions */}
                    <Card className="medical-card mb-4">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                <Button variant="primary">
                                    <FontAwesomeIcon icon="clock" className="me-2" />
                                    Clock In/Out
                                </Button>
                                <Button variant="success">
                                    <FontAwesomeIcon icon="file-invoice" className="me-2" />
                                    Submit Timesheet
                                </Button>
                                <Button variant="info">
                                    <FontAwesomeIcon icon="calendar-plus" className="me-2" />
                                    Update Availability
                                </Button>
                                <Button variant="warning">
                                    <FontAwesomeIcon icon="star" className="me-2" />
                                    Rate Client
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Profile Summary */}
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="id-badge" className="me-2" />
                            Profile Summary
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center mb-3">
                                <FontAwesomeIcon icon="user-circle" size="3x" className="text-primary mb-2" />
                                <h6>{user.name}</h6>
                                <Badge bg="success">Verified Caregiver</Badge>
                            </div>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Rating:</span>
                                    <span>
                                        <FontAwesomeIcon icon="star" className="text-warning me-1" />
                                        4.9/5.0
                                    </span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Completed Jobs:</span>
                                    <span>247</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Years Experience:</span>
                                    <span>5+</span>
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between px-0">
                                    <span>Specialization:</span>
                                    <span>Elder Care</span>
                                </ListGroup.Item>
                            </ListGroup>
                            <Button variant="outline-primary" className="w-100 mt-3">
                                <FontAwesomeIcon icon="edit" className="me-2" />
                                Edit Profile
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CaregiverDashboard;