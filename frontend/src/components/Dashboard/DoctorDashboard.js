import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayAppointments: 8,
        totalPatients: 156,
        pendingConsults: 3,
        completedToday: 5
    });

    const [todaySchedule, setTodaySchedule] = useState([
        { id: 1, time: '09:00 AM', patient: 'John Doe', type: 'Follow-up', status: 'completed' },
        { id: 2, time: '10:00 AM', patient: 'Sarah Johnson', type: 'Consultation', status: 'in-progress' },
        { id: 3, time: '11:00 AM', patient: 'Mike Wilson', type: 'Check-up', status: 'scheduled' },
        { id: 4, time: '02:00 PM', patient: 'Emily Davis', type: 'Urgent', status: 'scheduled' }
    ]);

    const [pendingTasks, setPendingTasks] = useState([
        { id: 1, task: 'Review test results for John Doe', priority: 'high', type: 'review' },
        { id: 2, task: 'Prescribe medication for Sarah Johnson', priority: 'medium', type: 'prescription' },
        { id: 3, task: 'Update treatment plan for Mike Wilson', priority: 'low', type: 'update' }
    ]);

    const [recentPatients, setRecentPatients] = useState([
        { id: 1, name: 'John Doe', lastVisit: '2 days ago', condition: 'Hypertension', status: 'stable' },
        { id: 2, name: 'Sarah Johnson', lastVisit: '1 week ago', condition: 'Diabetes', status: 'monitoring' },
        { id: 3, name: 'Mike Wilson', lastVisit: '3 days ago', condition: 'Back Pain', status: 'improving' }
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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'danger';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'secondary';
        }
    };

    return (
        <Container fluid className="fade-in">
            {/* Welcome Header */}
            <div className="dashboard-header text-center">
                <Row>
                    <Col>
                        <h1>
                            <FontAwesomeIcon icon="user-md" className="me-3" />
                            Good morning, Dr. {user.name}!
                        </h1>
                        <p className="mb-0 fs-5 opacity-75">Ready to make a difference today</p>
                    </Col>
                </Row>
            </div>

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="calendar-day" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.todayAppointments}</span>
                            <div className="stat-label">Today's Appointments</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="users" className="text-success mb-3" size="2x" />
                            <span className="stat-number">{stats.totalPatients}</span>
                            <div className="stat-label">Total Patients</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="clock" className="text-warning mb-3" size="2x" />
                            <span className="stat-number">{stats.pendingConsults}</span>
                            <div className="stat-label">Pending Consults</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="check-circle" className="text-info mb-3" size="2x" />
                            <span className="stat-number">{stats.completedToday}</span>
                            <div className="stat-label">Completed Today</div>
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
                                <FontAwesomeIcon icon="plus" className="me-1" />
                                Add Appointment
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Patient</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todaySchedule.map((appointment) => (
                                        <tr key={appointment.id}>
                                            <td className="fw-bold">{appointment.time}</td>
                                            <td>{appointment.patient}</td>
                                            <td>{appointment.type}</td>
                                            <td>{getStatusBadge(appointment.status)}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary" className="me-1">
                                                    <FontAwesomeIcon icon="eye" />
                                                </Button>
                                                <Button size="sm" variant="outline-success">
                                                    <FontAwesomeIcon icon="video" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Pending Tasks */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100">
                        <Card.Header>
                            <FontAwesomeIcon icon="tasks" className="me-2" />
                            Pending Tasks
                        </Card.Header>
                        <Card.Body>
                            {pendingTasks.map((task) => (
                                <div key={task.id} className="d-flex align-items-start mb-3 p-3 border rounded">
                                    <div className="me-2">
                                        <FontAwesomeIcon
                                            icon={
                                                task.type === 'review' ? 'clipboard-check' :
                                                    task.type === 'prescription' ? 'prescription' : 'edit'
                                            }
                                            className={`text-${getPriorityColor(task.priority)}`}
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <p className="mb-1 small">{task.task}</p>
                                        <Badge bg={getPriorityColor(task.priority)} className="small">
                                            {task.priority} priority
                                        </Badge>
                                    </div>
                                    <Button size="sm" variant="outline-success">
                                        <FontAwesomeIcon icon="check" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="link" className="p-0 text-primary">
                                View all tasks
                                <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Recent Patients */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-friends" className="me-2" />
                            Recent Patients
                        </Card.Header>
                        <Card.Body>
                            {recentPatients.map((patient) => (
                                <div key={patient.id} className="d-flex align-items-center justify-content-between p-3 mb-2 bg-light rounded">
                                    <div>
                                        <h6 className="mb-1">{patient.name}</h6>
                                        <small className="text-muted">{patient.condition}</small>
                                        <div className="small text-muted">Last visit: {patient.lastVisit}</div>
                                    </div>
                                    <div className="text-end">
                                        <Badge
                                            bg={
                                                patient.status === 'stable' ? 'success' :
                                                    patient.status === 'monitoring' ? 'warning' : 'info'
                                            }
                                            className="mb-2"
                                        >
                                            {patient.status}
                                        </Badge>
                                        <div>
                                            <Button size="sm" variant="outline-primary">
                                                <FontAwesomeIcon icon="eye" className="me-1" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline-primary" className="w-100">
                                <FontAwesomeIcon icon="users" className="me-2" />
                                View All Patients
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Quick Actions */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Button variant="primary" className="w-100 py-3">
                                        <div className="d-flex flex-column align-items-center">
                                            <FontAwesomeIcon icon="plus" size="lg" className="mb-2" />
                                            <span>New Patient</span>
                                        </div>
                                    </Button>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Button variant="success" className="w-100 py-3">
                                        <div className="d-flex flex-column align-items-center">
                                            <FontAwesomeIcon icon="video" size="lg" className="mb-2" />
                                            <span>Start Consultation</span>
                                        </div>
                                    </Button>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Button variant="info" className="w-100 py-3">
                                        <div className="d-flex flex-column align-items-center">
                                            <FontAwesomeIcon icon="prescription" size="lg" className="mb-2" />
                                            <span>Write Prescription</span>
                                        </div>
                                    </Button>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Button variant="warning" className="w-100 py-3">
                                        <div className="d-flex flex-column align-items-center">
                                            <FontAwesomeIcon icon="chart-bar" size="lg" className="mb-2" />
                                            <span>View Reports</span>
                                        </div>
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DoctorDashboard;