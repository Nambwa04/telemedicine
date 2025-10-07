import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const MedicationManagement = ({ userRole = 'patient' }) => {
    const [medications, setMedications] = useState([
        {
            id: 1,
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            timeSlots: ['08:00'],
            startDate: new Date(2025, 8, 1),
            endDate: new Date(2025, 11, 1),
            instructions: 'Take with food in the morning',
            prescribedBy: 'Dr. Sarah Johnson',
            refillsRemaining: 3,
            currentStock: 25,
            totalPills: 30,
            condition: 'Hypertension',
            status: 'active'
        },
        {
            id: 2,
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            timeSlots: ['08:00', '20:00'],
            startDate: new Date(2025, 7, 15),
            endDate: new Date(2026, 7, 15),
            instructions: 'Take with meals',
            prescribedBy: 'Dr. Michael Brown',
            refillsRemaining: 5,
            currentStock: 18,
            totalPills: 60,
            condition: 'Diabetes',
            status: 'active'
        },
        {
            id: 3,
            name: 'Vitamin D3',
            dosage: '1000IU',
            frequency: 'Once daily',
            timeSlots: ['09:00'],
            startDate: new Date(2025, 6, 1),
            endDate: new Date(2025, 12, 1),
            instructions: 'Take with breakfast',
            prescribedBy: 'Dr. Lisa Chen',
            refillsRemaining: 2,
            currentStock: 5,
            totalPills: 90,
            condition: 'Vitamin Deficiency',
            status: 'low_stock'
        }
    ]);

    const [medicationLog, setMedicationLog] = useState([
        { id: 1, medicationId: 1, date: new Date(), time: '08:00', taken: true, notes: '' },
        { id: 2, medicationId: 2, date: new Date(), time: '08:00', taken: true, notes: 'Taken with breakfast' },
        { id: 3, medicationId: 2, date: new Date(), time: '20:00', taken: false, notes: '' },
    ]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add', 'edit', 'reminder'
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: 'once_daily',
        timeSlots: ['08:00'],
        startDate: new Date(),
        endDate: null,
        instructions: '',
        condition: '',
        refillsRemaining: 0,
        totalPills: 0
    });

    // Reminder state reserved for future scheduling feature (currently unused)
    // const [reminders, setReminders] = useState([
    //     { id: 1, medicationId: 1, time: '08:00', enabled: true, sound: true },
    //     { id: 2, medicationId: 2, time: '08:00', enabled: true, sound: true },
    //     { id: 3, medicationId: 2, time: '20:00', enabled: true, sound: false },
    // ]);

    const [todaysSchedule, setTodaysSchedule] = useState([]);

    useEffect(() => {
        // Generate today's medication schedule
        const today = new Date();
        const schedule = [];

        medications.forEach(med => {
            if (med.status === 'active') {
                med.timeSlots.forEach(timeSlot => {
                    const [hour, minute] = timeSlot.split(':');
                    const scheduleTime = new Date(today);
                    scheduleTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

                    const logEntry = medicationLog.find(log =>
                        log.medicationId === med.id &&
                        log.time === timeSlot &&
                        log.date.toDateString() === today.toDateString()
                    );

                    schedule.push({
                        medicationId: med.id,
                        medication: med,
                        time: timeSlot,
                        scheduledTime: scheduleTime,
                        taken: logEntry ? logEntry.taken : false,
                        notes: logEntry ? logEntry.notes : '',
                        overdue: scheduleTime < new Date() && (!logEntry || !logEntry.taken)
                    });
                });
            }
        });

        schedule.sort((a, b) => a.scheduledTime - b.scheduledTime);
        setTodaysSchedule(schedule);
    }, [medications, medicationLog]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge bg="success">Active</Badge>;
            case 'low_stock':
                return <Badge bg="warning">Low Stock</Badge>;
            case 'expired':
                return <Badge bg="danger">Expired</Badge>;
            case 'paused':
                return <Badge bg="secondary">Paused</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const getComplianceColor = (percentage) => {
        if (percentage >= 90) return 'success';
        if (percentage >= 70) return 'warning';
        return 'danger';
    };

    const calculateCompliance = (medicationId) => {
        const logs = medicationLog.filter(log => log.medicationId === medicationId);
        const takenCount = logs.filter(log => log.taken).length;
        return logs.length > 0 ? Math.round((takenCount / logs.length) * 100) : 0;
    };

    const handleAddMedication = () => {
        setModalType('add');
        setFormData({
            name: '',
            dosage: '',
            frequency: 'once_daily',
            timeSlots: ['08:00'],
            startDate: new Date(),
            endDate: null,
            instructions: '',
            condition: '',
            refillsRemaining: 0,
            totalPills: 0
        });
        setShowModal(true);
    };

    const handleEditMedication = (medication) => {
        setModalType('edit');
        setSelectedMedication(medication);
        setFormData({
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            timeSlots: medication.timeSlots,
            startDate: medication.startDate,
            endDate: medication.endDate,
            instructions: medication.instructions,
            condition: medication.condition,
            refillsRemaining: medication.refillsRemaining,
            totalPills: medication.totalPills
        });
        setShowModal(true);
    };

    const handleMarkTaken = (scheduleItem) => {
        const newLogEntry = {
            id: medicationLog.length + 1,
            medicationId: scheduleItem.medicationId,
            date: new Date(),
            time: scheduleItem.time,
            taken: true,
            notes: '',
            takenAt: new Date()
        };

        setMedicationLog([...medicationLog, newLogEntry]);

        // Update medication stock
        setMedications(medications.map(med =>
            med.id === scheduleItem.medicationId
                ? { ...med, currentStock: Math.max(0, med.currentStock - 1) }
                : med
        ));
    };

    const handleSkipDose = (scheduleItem) => {
        const newLogEntry = {
            id: medicationLog.length + 1,
            medicationId: scheduleItem.medicationId,
            date: new Date(),
            time: scheduleItem.time,
            taken: false,
            notes: 'Skipped by user',
            skippedAt: new Date()
        };

        setMedicationLog([...medicationLog, newLogEntry]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (modalType === 'add') {
            const newMedication = {
                id: medications.length + 1,
                ...formData,
                prescribedBy: userRole === 'doctor' ? 'Current Doctor' : 'Dr. Assigned',
                currentStock: formData.totalPills,
                status: 'active'
            };
            setMedications([...medications, newMedication]);
        } else if (modalType === 'edit') {
            setMedications(medications.map(med =>
                med.id === selectedMedication.id
                    ? { ...med, ...formData }
                    : med
            ));
        }

        setShowModal(false);
    };

    return (
        <Container fluid className="fade-in">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>
                            <FontAwesomeIcon icon="pills" className="me-2 text-primary" />
                            Medication Management
                        </h2>
                        <Button variant="primary" onClick={handleAddMedication}>
                            <FontAwesomeIcon icon="plus" className="me-2" />
                            Add Medication
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Today's Schedule */}
            <Row className="mb-4">
                <Col>
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="clock" className="me-2" />
                            Today's Schedule
                        </Card.Header>
                        <Card.Body>
                            {todaysSchedule.length === 0 ? (
                                <Alert variant="info">
                                    <FontAwesomeIcon icon="info-circle" className="me-2" />
                                    No medications scheduled for today.
                                </Alert>
                            ) : (
                                <Row>
                                    {todaysSchedule.map((item, index) => (
                                        <Col lg={4} md={6} className="mb-3" key={index}>
                                            <Card className={`border ${item.overdue ? 'border-danger' : item.taken ? 'border-success' : 'border-warning'}`}>
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h6 className="mb-1">{item.medication.name}</h6>
                                                            <small className="text-muted">{item.medication.dosage}</small>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className={`fw-bold ${item.overdue ? 'text-danger' : 'text-primary'}`}>
                                                                {item.time}
                                                            </div>
                                                            {item.overdue && <small className="text-danger">Overdue</small>}
                                                        </div>
                                                    </div>
                                                    {item.medication.instructions && (
                                                        <p className="small text-muted mb-3">{item.medication.instructions}</p>
                                                    )}
                                                    {!item.taken ? (
                                                        <div className="d-flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                className="flex-grow-1"
                                                                onClick={() => handleMarkTaken(item)}
                                                            >
                                                                <FontAwesomeIcon icon="check" className="me-1" />
                                                                Taken
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-secondary"
                                                                onClick={() => handleSkipDose(item)}
                                                            >
                                                                Skip
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Alert variant="success" className="mb-0 py-2">
                                                            <FontAwesomeIcon icon="check-circle" className="me-2" />
                                                            Completed
                                                        </Alert>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Medications List */}
            <Row>
                <Col>
                    <Card className="medical-card">
                        <Card.Header>
                            <FontAwesomeIcon icon="list" className="me-2" />
                            My Medications
                        </Card.Header>
                        <Card.Body>
                            {medications.length === 0 ? (
                                <Alert variant="info">
                                    <FontAwesomeIcon icon="info-circle" className="me-2" />
                                    No medications added yet.
                                </Alert>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Medication</th>
                                            <th>Dosage & Frequency</th>
                                            <th>Stock</th>
                                            <th>Compliance</th>
                                            <th>Status</th>
                                            <th>Prescribed By</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {medications.map((medication) => {
                                            const compliance = calculateCompliance(medication.id);
                                            const stockPercentage = (medication.currentStock / medication.totalPills) * 100;

                                            return (
                                                <tr key={medication.id}>
                                                    <td>
                                                        <div>
                                                            <strong>{medication.name}</strong>
                                                            <div className="small text-muted">{medication.condition}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>{medication.dosage}</div>
                                                        <div className="small text-muted">{medication.frequency}</div>
                                                        <div className="small text-muted">Times: {medication.timeSlots.join(', ')}</div>
                                                    </td>
                                                    <td>
                                                        <div>{medication.currentStock}/{medication.totalPills} pills</div>
                                                        <ProgressBar
                                                            now={stockPercentage}
                                                            variant={stockPercentage < 20 ? 'danger' : stockPercentage < 50 ? 'warning' : 'success'}
                                                            size="sm"
                                                            className="mt-1"
                                                        />
                                                        <div className="small text-muted">{medication.refillsRemaining} refills left</div>
                                                    </td>
                                                    <td>
                                                        <div className={`fw-bold text-${getComplianceColor(compliance)}`}>
                                                            {compliance}%
                                                        </div>
                                                        <ProgressBar
                                                            now={compliance}
                                                            variant={getComplianceColor(compliance)}
                                                            size="sm"
                                                            className="mt-1"
                                                        />
                                                    </td>
                                                    <td>{getStatusBadge(medication.status)}</td>
                                                    <td>
                                                        <div>{medication.prescribedBy}</div>
                                                        <div className="small text-muted">
                                                            {medication.startDate.toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => handleEditMedication(medication)}
                                                            >
                                                                <FontAwesomeIcon icon="edit" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-info"
                                                                title="Set Reminders"
                                                            >
                                                                <FontAwesomeIcon icon="bell" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-success"
                                                                title="Request Refill"
                                                            >
                                                                <FontAwesomeIcon icon="prescription" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Add/Edit Medication Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={modalType === 'add' ? 'plus' : 'edit'} className="me-2" />
                        {modalType === 'add' ? 'Add New Medication' : 'Edit Medication'}
                    </Modal.Title>
                </Modal.Header>

                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Medication Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter medication name"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Dosage</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.dosage}
                                        onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                        placeholder="e.g., 10mg, 1 tablet"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Frequency</Form.Label>
                                    <Form.Select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                        required
                                    >
                                        <option value="once_daily">Once daily</option>
                                        <option value="twice_daily">Twice daily</option>
                                        <option value="three_times_daily">Three times daily</option>
                                        <option value="four_times_daily">Four times daily</option>
                                        <option value="as_needed">As needed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Condition</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        placeholder="e.g., Hypertension, Diabetes"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Total Pills</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.totalPills}
                                        onChange={(e) => setFormData({ ...formData, totalPills: parseInt(e.target.value) || 0 })}
                                        placeholder="Total number of pills"
                                        min="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Refills Remaining</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.refillsRemaining}
                                        onChange={(e) => setFormData({ ...formData, refillsRemaining: parseInt(e.target.value) || 0 })}
                                        placeholder="Number of refills"
                                        min="0"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Instructions</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.instructions}
                                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                        placeholder="Special instructions (e.g., take with food, avoid alcohol)"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {modalType === 'add' ? 'Add Medication' : 'Update Medication'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default MedicationManagement;