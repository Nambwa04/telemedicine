/**
 * Service for doctor-related operations.
 * Handles fetching doctors, managing doctor assignment requests, and related actions.
 * Includes fallback mock data for development.
 */
import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

/**
 * Fetch list of available doctors from the backend
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Array>} List of doctors
 */
export async function listDoctors(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.specialization) queryParams.append('specialization', params.specialization);

        const url = `/accounts/doctors/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);

        // Handle paginated response
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);

        // Map backend user data to doctor format
        return data.map(doctor => ({
            id: doctor.id,
            name: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || doctor.email,
            email: doctor.email,
            firstName: doctor.first_name || '',
            lastName: doctor.last_name || '',
            photo: null, // Add when profile photos are implemented
            specialization: doctor.specialization || 'General Medicine',
            experience: doctor.experience_years || 0,
            rating: doctor.rating || 4.5,
            reviewCount: doctor.review_count || 0,
            consultationFee: doctor.consultation_fee || 50,
            location: doctor.location || 'Not specified',
            availability: doctor.availability || 'Contact for availability',
            certifications: doctor.certifications || [],
            languages: doctor.languages || ['English'],
            bio: doctor.bio || 'Experienced medical professional dedicated to patient care.',
            verified: doctor.is_verified || false,
            patientsServed: doctor.patients_served || 0,
            role: doctor.role
        }));
    } catch (error) {
        console.error('Failed to fetch doctors:', error);
        return getMockDoctors();
    }
}

/**
 * Fetch doctor requests (for patients to see their requests, for doctors to see requests to them)
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Array>} List of doctor requests
 */
export async function listDoctorRequests(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.ordering) queryParams.append('ordering', params.ordering);

        const url = `/requests/doctor/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);

        // Handle paginated response
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);

        const user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('Current user for doctor requests:', user);

        return data.map(request => {
            const status = request.status || 'new';
            const userRole = user?.role;
            const isDoctor = userRole === 'doctor';
            const canAccept = isDoctor && status === 'new';
            const canDecline = isDoctor && ['new', 'accepted'].includes(status);

            console.log(`Doctor Request ${request.id}: status=${status}, role=${userRole}, canAccept=${canAccept}, canDecline=${canDecline}`);

            return {
                id: request.id,
                patientId: request.patient || null,
                patientName: request.patient_name || request.patient_email || 'Unknown',
                patientEmail: request.patient_email || '',
                doctorId: request.doctor || null,
                doctorName: request.doctor_name || request.doctor_email || null,
                doctorEmail: request.doctor_email || '',
                reason: request.reason || '',
                symptoms: request.symptoms || '',
                preferredDate: request.preferred_date ? new Date(request.preferred_date) : null,
                preferredTime: request.preferred_time || null,
                urgent: request.urgent || false,
                status,
                notes: request.notes || '',
                doctorNotes: request.doctor_notes || '',
                createdAt: request.created_at ? new Date(request.created_at) : new Date(),
                updatedAt: request.updated_at ? new Date(request.updated_at) : new Date(),
                canAccept,
                canDecline
            };
        });
    } catch (error) {
        console.error('Failed to fetch doctor requests:', error);
        return [];
    }
}

/**
 * Create a new doctor assignment request (patient requests a doctor)
 * @param {Object} requestData - Doctor request data
 * @returns {Promise<Object>} Created request
 */
export async function createDoctorRequest(requestData) {
    try {
        const payload = {
            doctor: requestData.doctorId,
            reason: requestData.reason || 'General consultation',
            symptoms: requestData.symptoms || '',
            preferred_date: requestData.preferredDate || null,
            preferred_time: requestData.preferredTime || null,
            urgent: requestData.urgent || false,
            notes: requestData.notes || ''
        };

        console.log('Creating doctor request:', payload);
        const response = await api.post('/requests/doctor/', payload);
        console.log('Doctor request created:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to create doctor request:', error);
        // Try to parse error response
        let errorMessage = error.message || error.toString();
        try {
            const errorData = JSON.parse(error.message);
            if (errorData) {
                // Format validation errors nicely
                const errors = Object.entries(errorData).map(([field, msgs]) => {
                    const msgArray = Array.isArray(msgs) ? msgs : [msgs];
                    return `${field}: ${msgArray.join(', ')}`;
                }).join('; ');
                errorMessage = errors || errorMessage;
            }
        } catch (e) {
            // If parsing fails, use original error message
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Get a single doctor request
 * @param {number} requestId
 * @returns {Promise<Object|null>} Doctor request or null
 */
export async function getDoctorRequest(requestId) {
    try {
        const raw = await api.get(`/requests/doctor/${requestId}/`);
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const userRole = user?.role;
        const isDoctor = userRole === 'doctor';
        const status = raw.status || 'new';

        return {
            id: raw.id,
            patientId: raw.patient || null,
            patientName: raw.patient_name || raw.patient_email || 'Unknown',
            patientEmail: raw.patient_email || '',
            doctorId: raw.doctor || null,
            doctorName: raw.doctor_name || raw.doctor_email || null,
            doctorEmail: raw.doctor_email || '',
            reason: raw.reason || '',
            symptoms: raw.symptoms || '',
            preferredDate: raw.preferred_date ? new Date(raw.preferred_date) : null,
            preferredTime: raw.preferred_time || null,
            urgent: raw.urgent || false,
            status,
            notes: raw.notes || '',
            doctorNotes: raw.doctor_notes || '',
            createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
            updatedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
            canAccept: isDoctor && status === 'new',
            canDecline: isDoctor && ['new', 'accepted'].includes(status)
        };
    } catch (error) {
        console.error('Failed to get doctor request:', error);
        return null;
    }
}

/**
 * Accept a doctor assignment request (doctor action)
 * @param {number} requestId
 * @returns {Promise<Object>} Updated request or error
 */
export async function acceptDoctorRequest(requestId) {
    try {
        console.log('Accepting doctor request:', requestId);
        const response = await api.post(`/requests/doctor/${requestId}/accept/`, {});
        console.log('Accept response:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to accept doctor request:', error);
        const errorMessage = error.message || error.toString();
        return { success: false, error: errorMessage };
    }
}

/**
 * Decline a doctor assignment request (doctor action)
 * @param {number} requestId
 * @returns {Promise<Object>} Updated request or error
 */
export async function declineDoctorRequest(requestId) {
    try {
        console.log('Declining doctor request:', requestId);
        const response = await api.post(`/requests/doctor/${requestId}/decline/`, {});
        console.log('Decline response:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to decline doctor request:', error);
        const errorMessage = error.message || error.toString();
        return { success: false, error: errorMessage };
    }
}

/**
 * Cancel a doctor assignment request (patient action)
 * @param {number} requestId
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelDoctorRequest(requestId) {
    try {
        const response = await api.patch(`/requests/doctor/${requestId}/`, { status: 'cancelled' });
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to cancel doctor request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mock doctors data for fallback
 */
function getMockDoctors() {
    return [
        {
            id: 1,
            name: 'Dr. James Kamau',
            email: 'james.kamau@hospital.com',
            photo: null,
            specialization: 'Cardiology',
            experience: 15,
            rating: 4.9,
            reviewCount: 234,
            consultationFee: 75,
            location: 'Nairobi Hospital',
            availability: 'Mon-Fri, 9AM-5PM',
            certifications: ['MD', 'FACC', 'Board Certified'],
            languages: ['English', 'Swahili'],
            bio: 'Experienced cardiologist specializing in heart disease prevention and treatment.',
            verified: true,
            patientsServed: 1500
        },
        {
            id: 2,
            name: 'Dr. Mary Njeri',
            email: 'mary.njeri@hospital.com',
            photo: null,
            specialization: 'Pediatrics',
            experience: 10,
            rating: 4.8,
            reviewCount: 189,
            consultationFee: 60,
            location: 'Aga Khan Hospital',
            availability: 'Mon-Sat, 8AM-4PM',
            certifications: ['MD', 'Board Certified Pediatrician'],
            languages: ['English', 'Swahili', 'Kikuyu'],
            bio: 'Dedicated pediatrician with a passion for child healthcare and development.',
            verified: true,
            patientsServed: 980
        },
        {
            id: 3,
            name: 'Dr. Peter Omondi',
            email: 'peter.omondi@hospital.com',
            photo: null,
            specialization: 'General Medicine',
            experience: 8,
            rating: 4.7,
            reviewCount: 156,
            consultationFee: 50,
            location: 'Kenyatta National Hospital',
            availability: 'Mon-Fri, 10AM-6PM',
            certifications: ['MD', 'MBBS'],
            languages: ['English', 'Swahili', 'Luo'],
            bio: 'General practitioner offering comprehensive primary care services.',
            verified: true,
            patientsServed: 750
        }
    ];
}
