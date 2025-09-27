// appointmentService.js
// Mock in-memory appointment management service.
// Replace with real API calls later.

let _appointments = [
    { id: 1, date: '2025-09-28', time: '09:00', patientId: 101, patientName: 'John Doe', type: 'Follow-up', status: 'scheduled', notes: 'Blood pressure review' },
    { id: 2, date: '2025-09-28', time: '10:30', patientId: 102, patientName: 'Jane Miller', type: 'Consultation', status: 'scheduled', notes: 'Discuss A1C results' },
    { id: 3, date: '2025-09-29', time: '14:00', patientId: 103, patientName: 'Carlos Ruiz', type: 'Check-up', status: 'scheduled', notes: 'Asthma control assessment' }
];
let _idCounter = 4;

function delay(ms = 250) { return new Promise(r => setTimeout(r, ms)); }

export async function listAppointments({ date } = {}) {
    await delay();
    if (date) {
        return _appointments.filter(a => a.date === date).sort((a, b) => (a.time.localeCompare(b.time)));
    }
    return [..._appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export async function createAppointment({ date, time, patientId, patientName, type, notes }) {
    await delay();
    const newAppt = { id: _idCounter++, date, time, patientId, patientName, type, notes: notes || '', status: 'scheduled' };
    _appointments.push(newAppt);
    return newAppt;
}

export async function updateAppointment(id, patch) {
    await delay();
    const idx = _appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    _appointments[idx] = { ..._appointments[idx], ...patch };
    return _appointments[idx];
}

export async function cancelAppointment(id) {
    return updateAppointment(id, { status: 'cancelled' });
}

export async function deleteAppointment(id) {
    await delay();
    _appointments = _appointments.filter(a => a.id !== id);
    return true;
}
