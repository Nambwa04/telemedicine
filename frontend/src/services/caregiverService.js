import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

/**
 * Fetch list of caregivers from the backend
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Array>} List of caregivers
 */
export async function listCaregivers(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);

        const url = `/accounts/caregivers/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);

        // Handle paginated response
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);

        // Map backend user data to caregiver format
        return data.map(caregiver => ({
            id: caregiver.id,
            name: `${caregiver.first_name || ''} ${caregiver.last_name || ''}`.trim() || caregiver.email,
            email: caregiver.email,
            firstName: caregiver.first_name || '',
            lastName: caregiver.last_name || '',
            photo: null, // Add when profile photos are implemented
            specializations: caregiver.specializations || ['General Care'],
            experience: caregiver.experience_years || 0,
            rating: caregiver.rating || 4.5,
            reviewCount: caregiver.review_count || 0,
            hourlyRate: caregiver.hourly_rate || 25,
            location: caregiver.location || 'Not specified',
            // Use numeric 0 for missing distance so filters treat it as very close instead of excluding
            distance: caregiver.distance ?? 0,
            availability: caregiver.availability || 'Contact for availability',
            certifications: caregiver.certifications || [],
            languages: caregiver.languages || ['English'],
            description: caregiver.bio || 'Experienced caregiver dedicated to providing quality care.',
            verified: caregiver.is_verified || false,
            completedJobs: caregiver.completed_jobs || 0,
            role: caregiver.role
        }));
    } catch (error) {
        console.error('Failed to fetch caregivers:', error);
        // Return mock data as fallback
        return getMockCaregivers();
    }
}

/**
 * Fetch caregiver requests from the backend
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Array>} List of care requests
 */
export async function listCareRequests(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.ordering) queryParams.append('ordering', params.ordering);

        const url = `/requests/care/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);

        // Handle paginated response
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);

        const user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('Current user for requests:', user);

        return data.map(request => {
            const status = request.status || 'new';
            const durationNum = parseFloat(request.duration) || 0;
            const rateNum = parseFloat(request.rate) || 0;
            const isCaregiver = user?.role === 'caregiver';
            const canAccept = isCaregiver && status === 'new';
            const canDecline = isCaregiver && ['new', 'accepted'].includes(status);

            console.log(`Request ${request.id}: status=${status}, isCaregiver=${isCaregiver}, canAccept=${canAccept}, canDecline=${canDecline}`);

            return {
                id: request.id,
                caregiverId: request.caregiver || request.caregiver_id || null,
                caregiverName: request.caregiver_email || request.caregiver_name || null,
                status,
                requestedDate: request.created_at ? new Date(request.created_at) : new Date(),
                duration: request.duration || 'Not specified',
                services: request.service ? [request.service] : [],
                hourlyRate: rateNum,
                totalCost: rateNum * durationNum || 0,
                notes: request.notes || '',
                family: request.family || '',
                urgent: request.urgent || false,
                requestedBy: request.created_by_email || 'Unknown',
                canAccept,
                canDecline
            };
        });
    } catch (error) {
        console.error('Failed to fetch care requests:', error);
        return [];
    }
}

/**
 * Create a new care request
 * @param {Object} requestData - Care request data
 * @returns {Promise<Object>} Created request
 */
export async function createCareRequest(requestData) {
    try {
        const payload = {
            family: requestData.family || 'Patient Family',
            service: requestData.services?.join(', ') || requestData.service || 'General Care',
            duration: requestData.duration?.toString() || '4 hours',
            rate: parseFloat(requestData.hourlyRate) || 25,
            unit: 'hour',
            urgent: requestData.urgentCare || false,
            notes: requestData.notes || ''
        };

        if (requestData.caregiverId) payload.caregiver = requestData.caregiverId;
        if (requestData.patientId) payload.patient = requestData.patientId; // optional explicit override

        const response = await api.post('/requests/care/', payload);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to create care request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a care request
 * @param {number} requestId - Request ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated request
 */
export async function updateCareRequest(requestId, updateData) {
    try {
        const response = await api.patch(`/requests/care/${requestId}/`, updateData);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to update care request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a care request
 * @param {number} requestId - Request ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCareRequest(requestId) {
    try {
        await api.delete(`/requests/care/${requestId}/`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete care request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Accept a care request (caregiver action)
 * @param {number} requestId
 * @returns {Promise<Object>} Updated request or error
 */
export async function acceptCareRequest(requestId) {
    try {
        console.log('Accepting request:', requestId);
        const response = await api.post(`/requests/care/${requestId}/accept/`, {});
        console.log('Accept response:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to accept care request:', error);
        const errorMessage = error.message || error.toString();
        return { success: false, error: errorMessage };
    }
}

/**
 * Decline a care request (caregiver action)
 * @param {number} requestId
 * @returns {Promise<Object>} Updated request or error
 */
export async function declineCareRequest(requestId) {
    try {
        console.log('Declining request:', requestId);
        const response = await api.post(`/requests/care/${requestId}/decline/`, {});
        console.log('Decline response:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to decline care request:', error);
        const errorMessage = error.message || error.toString();
        return { success: false, error: errorMessage };
    }
}

/**
 * Get full details for a single care request
 * @param {number} requestId
 * @returns {Promise<Object|null>} Care request or null on error
 */
export async function getCareRequest(requestId) {
    try {
        const raw = await api.get(`/requests/care/${requestId}/`);
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const isCaregiver = user?.role === 'caregiver';
        const status = raw.status || 'new';
        const durationNum = parseFloat(raw.duration) || 0;
        const rateNum = parseFloat(raw.rate) || 0;
        return {
            id: raw.id,
            caregiverId: raw.caregiver || null,
            caregiverName: raw.caregiver_email || null,
            patientId: raw.patient || null,
            patientEmail: raw.patient_email || null,
            status,
            requestedDate: raw.created_at ? new Date(raw.created_at) : new Date(),
            duration: raw.duration || 'Not specified',
            services: raw.service ? [raw.service] : [],
            hourlyRate: rateNum,
            totalCost: rateNum * durationNum || 0,
            notes: raw.notes || '',
            family: raw.family || '',
            urgent: raw.urgent || false,
            requestedBy: raw.created_by_email || 'Unknown',
            canAccept: isCaregiver && status === 'new',
            canDecline: isCaregiver && ['new', 'accepted'].includes(status)
        };
    } catch (error) {
        console.error('Failed to get care request:', error);
        return null;
    }
}

/**
 * Mock caregivers data for fallback
 */
function getMockCaregivers() {
    return [
        {
            id: 1,
            name: 'Sarah Wangeci',
            email: 'sarah.wangeci@example.com',
            photo: null,
            specializations: ['Elder Care', 'Alzheimer Care', 'Medication Management'],
            experience: 8,
            rating: 4.9,
            reviewCount: 127,
            hourlyRate: 28,
            location: 'Downtown Area',
            distance: '2.3 miles',
            availability: 'Available Now',
            certifications: ['CNA', 'First Aid', 'CPR'],
            languages: ['English', 'Spanish'],
            description: 'Compassionate caregiver with extensive experience in elder care and chronic condition management.',
            verified: true,
            completedJobs: 245
        },
        {
            id: 2,
            name: 'Michael Otieno',
            email: 'michael.otieno@example.com',
            photo: null,
            specializations: ['Physical Therapy', 'Post-Surgery Care', 'Mobility Assistance'],
            experience: 6,
            rating: 4.7,
            reviewCount: 89,
            hourlyRate: 32,
            location: 'Northside',
            distance: '4.1 miles',
            availability: 'Available Tomorrow',
            certifications: ['PTA', 'First Aid', 'CPR'],
            languages: ['English', 'Spanish'],
            description: 'Licensed Physical Therapist Assistant specializing in post-operative care and rehabilitation.',
            verified: true,
            completedJobs: 156
        },
        {
            id: 3,
            name: 'Emily Mathenge',
            email: 'emily.mathenge@example.com',
            photo: null,
            specializations: ['Companion Care', 'Light Housekeeping', 'Meal Preparation'],
            experience: 4,
            rating: 4.8,
            reviewCount: 64,
            hourlyRate: 25,
            location: 'Westside',
            distance: '3.7 miles',
            availability: 'Available Now',
            certifications: ['First Aid', 'CPR', 'Food Safety'],
            languages: ['English', 'Mandarin'],
            description: 'Dedicated companion caregiver focused on improving quality of life through personalized care.',
            verified: true,
            completedJobs: 98
        }
    ];
}
