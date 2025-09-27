// healthService.js
// Centralized mock service for fetching patient-specific health metrics and patient list.
// Later you can replace individual functions with real API calls (e.g., fetch/axios).

export async function fetchPatientMetrics(patientId) {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 300));
    // Return mock personalized metrics; in real app fetch from backend using patientId.
    return {
        patientId,
        overview: {
            bloodPressure: { current: '118/79', trend: 'stable', lastReading: '2025-09-25' },
            heartRate: { current: 71, trend: 'normal', lastReading: '2025-09-25' },
            weight: { current: 148, trend: 'improving', lastReading: '2025-09-24' },
            bloodSugar: { current: 97, trend: 'stable', lastReading: '2025-09-25' },
            temperature: { current: 98.4, trend: 'normal', lastReading: '2025-09-25' }
        },
        vitals: [
            { date: '2025-09-21', bloodPressure: 122, heartRate: 74, weight: 149.5, bloodSugar: 99 },
            { date: '2025-09-22', bloodPressure: 121, heartRate: 73, weight: 149, bloodSugar: 96 },
            { date: '2025-09-23', bloodPressure: 120, heartRate: 72, weight: 148.7, bloodSugar: 95 },
            { date: '2025-09-24', bloodPressure: 119, heartRate: 71, weight: 148.3, bloodSugar: 96 },
            { date: '2025-09-25', bloodPressure: 118, heartRate: 71, weight: 148, bloodSugar: 97 }
        ],
        medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', compliance: 96, nextDue: '2025-09-28' },
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', compliance: 90, nextDue: '2025-09-27' }
        ],
        labResults: [
            { test: 'Hemoglobin A1C', value: '6.1%', range: '<7%', status: 'normal', date: '2025-09-10' },
            { test: 'LDL Cholesterol', value: '105 mg/dL', range: '<100 mg/dL', status: 'borderline', date: '2025-09-10' }
        ],
        symptoms: [
            { date: '2025-09-26', symptom: 'Mild headache', severity: 2, duration: '1 hour', notes: 'Resolved with hydration' }
        ],
        appointments: [
            { date: '2025-10-01', doctor: 'Dr. Smith', type: 'Follow-up', notes: 'Review vitals' }
        ]
    };
}

export async function fetchPatientList() {
    await new Promise(r => setTimeout(r, 250));
    return [
        { id: 101, name: 'John Doe', age: 46, condition: 'Hypertension', lastVisit: '2025-09-20' },
        { id: 102, name: 'Jane Miller', age: 59, condition: 'Type 2 Diabetes', lastVisit: '2025-09-19' },
        { id: 103, name: 'Carlos Ruiz', age: 36, condition: 'Asthma', lastVisit: '2025-09-18' },
        { id: 104, name: 'Aisha Khan', age: 29, condition: 'Thyroid Disorder', lastVisit: '2025-09-17' }
    ];
}

export function mapTrendLabel(trend) {
    switch (trend) {
        case 'improving': return { icon: 'arrow-up', color: 'success', text: 'Improving' };
        case 'stable': return { icon: 'minus', color: 'primary', text: 'Stable' };
        case 'declining': return { icon: 'arrow-down', color: 'danger', text: 'Declining' };
        case 'normal': return { icon: 'check', color: 'success', text: 'Normal' };
        default: return { icon: 'question', color: 'secondary', text: 'Unknown' };
    }
}
