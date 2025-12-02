import React, { useState, useEffect } from 'react';
import { fetchPrescriptions } from '../../services/prescriptionService';
import { useAuth } from '../../context/AuthContext';
import { Container, Table, Badge, Alert } from 'react-bootstrap';
import { fetchPatientList } from '../../services/healthService';

/**
 * MedicationManagement Component
 * 
 * A simplified view for managing medications.
 * Displays a list of prescriptions for a patient.
 * Allows caregivers to select a patient to view their medications.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.userRole='patient'] - The role of the current user
 */
const MedicationManagement = ({ userRole = 'patient' }) => {
    const { user } = useAuth();
    const [medications, setMedications] = useState([]);
    const [medicationsLoading, setMedicationsLoading] = useState(true);
    const [medicationsError, setMedicationsError] = useState(null);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setMedicationsLoading(true);
            setMedicationsError(null);
            try {
                let patientId = user.id;
                if (userRole === 'caregiver') {
                    if (!selectedPatient) {
                        setMedications([]);
                        setMedicationsLoading(false);
                        return;
                    }
                    patientId = selectedPatient.id;
                }
                const data = await fetchPrescriptions(patientId);
                setMedications(Array.isArray(data) ? data : []);
            } catch (e) {
                setMedicationsError('Failed to load prescriptions');
            } finally {
                setMedicationsLoading(false);
            }
        };
        fetchData();
    }, [user, userRole, selectedPatient]);

    useEffect(() => {
        if (userRole === 'caregiver') {
            fetchPatientList().then(setPatients).catch(() => setPatients([]));
        }
    }, [userRole]);



    // Caregiver: patient selection UI
    const CaregiverPatientSelect = () => (
        userRole === 'caregiver' ? (
            <div className="mb-3">
                <label>Select Patient: </label>
                <select
                    value={selectedPatient?.id || ''}
                    onChange={e => {
                        const p = patients.find(pt => pt.id === parseInt(e.target.value));
                        setSelectedPatient(p);
                    }}
                >
                    <option value="">-- Select --</option>
                    {patients.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                </select>
            </div>
        ) : null
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'expired':
                return <Badge bg="danger">Expired</Badge>;
            case 'paused':
                return <Badge bg="secondary">Paused</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // --- Render ---
    return (
        <Container>
            <h2>Medication Management</h2>
            {/* Caregiver patient selection dropdown */}
            {userRole === 'caregiver' && <CaregiverPatientSelect />}
            {/* Loading/Error States */}
            {medicationsLoading && <Alert variant="info">Loading medications...</Alert>}
            {medicationsError && <Alert variant="danger">{medicationsError}</Alert>}
            {/* Medications Table */}
            {!medicationsLoading && medications.length > 0 && (
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {medications.map(med => (
                            <tr key={med.id}>
                                <td>{med.name}</td>
                                <td>{med.dosage}</td>
                                <td>{med.frequency}</td>
                                <td>{getStatusBadge(med.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            {!medicationsLoading && medications.length === 0 && (
                <Alert variant="warning">No medications found.</Alert>
            )}
        </Container>
    );

    // End of component
};

export default MedicationManagement;