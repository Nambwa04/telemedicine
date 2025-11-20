import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

/**
 * Fetch timesheet entries for the current caregiver
 * @param {Object} params - Query parameters for filtering (e.g., date, status)
 * @returns {Promise<Array>} List of timesheet entries
 */
export async function listTimesheetEntries(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.date) queryParams.append('date', params.date);
        if (params.status) queryParams.append('status', params.status);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);

        const url = `/timesheet/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);

        // Handle paginated response
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);

        return data.map(entry => ({
            id: entry.id,
            caregiverId: entry.caregiver,
            caregiverName: entry.caregiver_name,
            date: entry.date,
            client: entry.client,
            start: entry.start_time,
            end: entry.end_time,
            break: entry.break_minutes,
            hours: parseFloat(entry.hours),
            rate: parseFloat(entry.rate),
            subtotal: parseFloat(entry.subtotal),
            status: entry.status,
            notes: entry.notes || '',
            createdAt: entry.created_at,
            updatedAt: entry.updated_at
        }));
    } catch (error) {
        console.error('Failed to fetch timesheet entries:', error);
        throw error;
    }
}

/**
 * Create a new timesheet entry
 * @param {Object} entryData - Timesheet entry data
 * @returns {Promise<Object>} Created entry
 */
export async function createTimesheetEntry(entryData) {
    try {
        const payload = {
            date: entryData.date,
            client: entryData.client,
            break_minutes: entryData.break || 0,
            rate: parseFloat(entryData.rate),
            notes: entryData.notes || '',
            status: entryData.status || 'draft'
        };
        
        // Only include times if provided (for backward compatibility)
        if (entryData.start) payload.start_time = entryData.start;
        if (entryData.end) payload.end_time = entryData.end;

        const response = await api.post('/timesheet/', payload);

        return {
            id: response.id,
            caregiverId: response.caregiver,
            caregiverName: response.caregiver_name,
            date: response.date,
            client: response.client,
            start: response.start_time,
            end: response.end_time,
            break: response.break_minutes,
            hours: parseFloat(response.hours),
            rate: parseFloat(response.rate),
            subtotal: parseFloat(response.subtotal),
            status: response.status,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to create timesheet entry:', error);
        throw error;
    }
}

/**
 * Update an existing timesheet entry
 * @param {number} id - Entry ID
 * @param {Object} entryData - Updated entry data
 * @returns {Promise<Object>} Updated entry
 */
export async function updateTimesheetEntry(id, entryData) {
    try {
        const payload = {
            date: entryData.date,
            client: entryData.client,
            break_minutes: entryData.break || 0,
            rate: parseFloat(entryData.rate),
            notes: entryData.notes || '',
            status: entryData.status || 'draft'
        };
        
        // Only include times if provided
        if (entryData.start) payload.start_time = entryData.start;
        if (entryData.end) payload.end_time = entryData.end;

        const response = await api.put(`/timesheet/${id}/`, payload);

        return {
            id: response.id,
            caregiverId: response.caregiver,
            caregiverName: response.caregiver_name,
            date: response.date,
            client: response.client,
            start: response.start_time,
            end: response.end_time,
            break: response.break_minutes,
            hours: parseFloat(response.hours),
            rate: parseFloat(response.rate),
            subtotal: parseFloat(response.subtotal),
            status: response.status,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to update timesheet entry:', error);
        throw error;
    }
}

/**
 * Delete a timesheet entry
 * @param {number} id - Entry ID
 * @returns {Promise<void>}
 */
export async function deleteTimesheetEntry(id) {
    try {
        await api.delete(`/timesheet/${id}/`);
    } catch (error) {
        console.error('Failed to delete timesheet entry:', error);
        throw error;
    }
}

/**
 * Submit multiple timesheet entries for approval
 * @param {Array<number>} entryIds - Array of entry IDs to submit
 * @returns {Promise<Object>} Submission result
 */
export async function submitTimesheetWeek(entryIds) {
    try {
        const response = await api.post('/timesheet/submit_week/', {
            entry_ids: entryIds
        });

        return {
            success: true,
            message: response.message,
            updatedCount: response.updated_count
        };
    } catch (error) {
        console.error('Failed to submit timesheet week:', error);
        throw error;
    }
}

/**
 * Clock in: start a new in-progress entry.
 * @param {Object} data - { client, rate, notes }
 * @returns {Promise<Object>} New in-progress entry
 */
export async function clockInTimesheetEntry(data = {}) {
    try {
        const response = await api.post('/timesheet/clock_in/', {
            client: data.client || 'Client',
            rate: parseFloat(data.rate || 0),
            notes: data.notes || ''
        });
        return {
            id: response.id,
            caregiverId: response.caregiver,
            caregiverName: response.caregiver_name,
            date: response.date,
            client: response.client,
            start: response.start_time,
            end: response.end_time,
            break: response.break_minutes,
            hours: parseFloat(response.hours),
            rate: parseFloat(response.rate),
            subtotal: parseFloat(response.subtotal),
            status: response.status,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to clock in:', error);
        throw error;
    }
}

/**
 * Clock out: finalize an in-progress entry.
 * @param {number} id - Entry ID
 * @returns {Promise<Object>} Updated entry now draft
 */
export async function clockOutTimesheetEntry(id) {
    try {
        const response = await api.post(`/timesheet/${id}/clock_out/`);
        return {
            id: response.id,
            caregiverId: response.caregiver,
            caregiverName: response.caregiver_name,
            date: response.date,
            client: response.client,
            start: response.start_time,
            end: response.end_time,
            break: response.break_minutes,
            hours: parseFloat(response.hours),
            rate: parseFloat(response.rate),
            subtotal: parseFloat(response.subtotal),
            status: response.status,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to clock out:', error);
        throw error;
    }
}

/**
 * Approve a timesheet entry (admin only)
 * @param {number} id - Entry ID
 * @returns {Promise<Object>} Approved entry
 */
export async function approveTimesheetEntry(id) {
    try {
        const response = await api.post(`/timesheet/${id}/approve/`);
        return response;
    } catch (error) {
        console.error('Failed to approve timesheet entry:', error);
        throw error;
    }
}

/**
 * Reject a timesheet entry (admin only)
 * @param {number} id - Entry ID
 * @param {string} notes - Rejection reason
 * @returns {Promise<Object>} Rejected entry
 */
export async function rejectTimesheetEntry(id, notes) {
    try {
        const response = await api.post(`/timesheet/${id}/reject/`, { notes });
        return response;
    } catch (error) {
        console.error('Failed to reject timesheet entry:', error);
        throw error;
    }
}
