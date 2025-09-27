import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import QuickActionTile from '../Common/QuickActionTile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import { getStatusMeta } from '../../utils/statusStyles';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [stats] = useState({
        todayAppointments: 8,
        totalPatients: 156,
        pendingConsults: 3,
        completedToday: 5
    });

    const [todaySchedule] = useState([
        { id: 1, time: '09:00 AM', patient: 'John Doe', type: 'Follow-up', status: 'completed' },
        { id: 2, time: '10:00 AM', patient: 'Sarah Johnson', type: 'Consultation', status: 'in-progress' },
        { id: 3, time: '11:00 AM', patient: 'Mike Wilson', type: 'Check-up', status: 'scheduled' },
        { id: 4, time: '02:00 PM', patient: 'Emily Davis', type: 'Urgent', status: 'scheduled' }
    ]);

    const [pendingTasks] = useState([
        { id: 1, task: 'Review test results for John Doe', priority: 'high', type: 'review' },
        { id: 2, task: 'Prescribe medication for Sarah Johnson', priority: 'medium', type: 'prescription' },
        { id: 3, task: 'Update treatment plan for Mike Wilson', priority: 'low', type: 'update' }
    ]);

    const [recentPatients] = useState([
        { id: 1, name: 'John Doe', lastVisit: '2 days ago', condition: 'Hypertension', status: 'stable' },
        { id: 2, name: 'Sarah Johnson', lastVisit: '1 week ago', condition: 'Diabetes', status: 'monitoring' },
        { id: 3, name: 'Mike Wilson', lastVisit: '3 days ago', condition: 'Back Pain', status: 'improving' }
    ]);

    const priorityMeta = {
        high: { label: 'High', badgeClass: 'badge-soft-danger' },
        medium: { label: 'Medium', badgeClass: 'badge-soft-warning' },
        low: { label: 'Low', badgeClass: 'badge-soft-success' }
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
                    <Card className="stat-card h-100 border-0 shadow-sm">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="calendar-day" className="text-primary mb-3" size="2x" />
                            <span className="stat-number">{stats.todayAppointments}</span>
                            <div className="stat-label">Today's Appointments</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100 border-0 shadow-sm">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="users" className="text-success mb-3" size="2x" />
                            <span className="stat-number">{stats.totalPatients}</span>
                            <div className="stat-label">Total Patients</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100 border-0 shadow-sm">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon="clock" className="text-warning mb-3" size="2x" />
                            <span className="stat-number">{stats.pendingConsults}</span>
                            <div className="stat-label">Pending Consults</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <Card className="stat-card h-100 border-0 shadow-sm">
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
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>
                                <FontAwesomeIcon icon="calendar" className="me-2" />
                                Today's Schedule
                            </span>
                            <Button size="sm" className="btn-gradient-primary">
                                <FontAwesomeIcon icon="plus" className="me-1" /> Add
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
                                    {todaySchedule.map(appt => {
                                        const meta = getStatusMeta('appointment', appt.status);
                                        return (
                                            <tr key={appt.id}>
                                                <td className="fw-bold">{appt.time}</td>
                                                <td>{appt.patient}</td>
                                                <td>{appt.type}</td>
                                                <td><span className={`badge ${meta.badgeClass}`}>{meta.label}</span></td>
                                                <td className="quick-actions">
                                                    <button type="button" className="btn-icon me-1" title="View">
                                                        <FontAwesomeIcon icon="eye" />
                                                    </button>
                                                    <button type="button" className="btn-icon" title="Video">
                                                        <FontAwesomeIcon icon="video" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Pending Tasks */}
                <Col lg={4} className="mb-4">
                    <Card className="medical-card h-100 border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="tasks" className="me-2" />
                            Pending Tasks
                        </Card.Header>
                        <Card.Body>
                            {pendingTasks.map(task => {
                                const pm = priorityMeta[task.priority] || { label: task.priority, badgeClass: 'badge-soft-secondary' };
                                const icon = task.type === 'review' ? 'clipboard-check' : task.type === 'prescription' ? 'prescription' : 'edit';
                                return (
                                    <div key={task.id} className="d-flex align-items-start mb-3 p-3 rounded border-0 shadow-sm bg-white position-relative task-tile">
                                        <div className="me-3 mt-1">
                                            <div className={`btn-icon`}>
                                                <FontAwesomeIcon icon={icon} />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <p className="mb-1 small fw-semibold">{task.task}</p>
                                            <span className={`badge ${pm.badgeClass}`}>{pm.label}</span>
                                        </div>
                                        <div>
                                            <button type="button" className="btn-icon" title="Complete">
                                                <FontAwesomeIcon icon="check" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <Button variant="link" className="p-0 text-primary fw-semibold">
                                View all tasks <FontAwesomeIcon icon="arrow-right" className="ms-1" />
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Recent Patients */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="user-friends" className="me-2" />
                            Recent Patients
                        </Card.Header>
                        <Card.Body>
                            {recentPatients.map(p => {
                                const statusMap = {
                                    stable: 'badge-soft-success',
                                    monitoring: 'badge-soft-warning',
                                    improving: 'badge-soft-info'
                                };
                                return (
                                    <div key={p.id} className="d-flex align-items-center justify-content-between p-3 mb-2 rounded bg-white shadow-sm patient-tile">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">{p.name}</h6>
                                            <small className="text-muted d-block">{p.condition}</small>
                                            <div className="small text-muted">Last visit: {p.lastVisit}</div>
                                        </div>
                                        <div className="text-end">
                                            <span className={`badge ${statusMap[p.status] || 'badge-soft-secondary'} mb-2`}>{p.status}</span>
                                            <div>
                                                <button type="button" className="btn-icon" title="View">
                                                    <FontAwesomeIcon icon="eye" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <Button className="btn-gradient-primary w-100 fw-semibold mt-2">
                                <FontAwesomeIcon icon="users" className="me-2" /> View All Patients
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Quick Actions */}
                <Col lg={6} className="mb-4">
                    <Card className="medical-card border-0 shadow-sm">
                        <Card.Header>
                            <FontAwesomeIcon icon="bolt" className="me-2" />
                            Quick Actions
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6} className="mb-3"><QuickActionTile icon="plus" label="New Patient" accent="gradient-primary" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="video" label="Consult" accent="gradient-success" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="prescription" label="Prescription" accent="gradient-info" /></Col>
                                <Col md={6} className="mb-3"><QuickActionTile icon="chart-bar" label="Reports" accent="gradient-warning" /></Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DoctorDashboard;