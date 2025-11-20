import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

/**
 * List weekly availability slots for a caregiver
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>}
 */
export async function listWeeklyAvailability(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.caregiver_id) queryParams.append('caregiver_id', params.caregiver_id);
        
        const url = `/availability/weekly/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);
        
        return data.map(slot => ({
            id: slot.id,
            caregiverId: slot.caregiver,
            caregiverName: slot.caregiver_name,
            dayOfWeek: slot.day_of_week,
            dayDisplay: slot.day_display,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            notes: slot.notes || '',
            createdAt: slot.created_at,
            updatedAt: slot.updated_at
        }));
    } catch (error) {
        console.error('Failed to fetch weekly availability:', error);
        throw error;
    }
}

/**
 * Create a single weekly availability slot
 * @param {Object} slotData
 * @returns {Promise<Object>}
 */
export async function createWeeklySlot(slotData) {
    try {
        const payload = {
            day_of_week: slotData.dayOfWeek,
            start_time: slotData.startTime,
            end_time: slotData.endTime,
            notes: slotData.notes || ''
        };
        
        const response = await api.post('/availability/weekly/', payload);
        return {
            id: response.id,
            caregiverId: response.caregiver,
            dayOfWeek: response.day_of_week,
            dayDisplay: response.day_display,
            startTime: response.start_time,
            endTime: response.end_time,
            isAvailable: response.is_available,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to create weekly slot:', error);
        throw error;
    }
}

/**
 * Bulk create weekly availability slots for multiple days
 * @param {Object} data - { days: [], startTime: '', endTime: '', notes: '' }
 * @returns {Promise<Array>}
 */
export async function bulkCreateWeeklySlots(data) {
    try {
        const payload = {
            days: data.days,
            start_time: data.startTime,
            end_time: data.endTime,
            notes: data.notes || ''
        };
        
        const response = await api.post('/availability/weekly/bulk_create/', payload);
        return response.map(slot => ({
            id: slot.id,
            caregiverId: slot.caregiver,
            dayOfWeek: slot.day_of_week,
            dayDisplay: slot.day_display,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            notes: slot.notes || ''
        }));
    } catch (error) {
        console.error('Failed to bulk create weekly slots:', error);
        throw error;
    }
}

/**
 * Update a weekly availability slot
 * @param {number} id
 * @param {Object} slotData
 * @returns {Promise<Object>}
 */
export async function updateWeeklySlot(id, slotData) {
    try {
        const payload = {
            day_of_week: slotData.dayOfWeek,
            start_time: slotData.startTime,
            end_time: slotData.endTime,
            is_available: slotData.isAvailable,
            notes: slotData.notes || ''
        };
        
        const response = await api.put(`/availability/weekly/${id}/`, payload);
        return {
            id: response.id,
            caregiverId: response.caregiver,
            dayOfWeek: response.day_of_week,
            dayDisplay: response.day_display,
            startTime: response.start_time,
            endTime: response.end_time,
            isAvailable: response.is_available,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to update weekly slot:', error);
        throw error;
    }
}

/**
 * Delete a weekly availability slot
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteWeeklySlot(id) {
    try {
        await api.delete(`/availability/weekly/${id}/`);
    } catch (error) {
        console.error('Failed to delete weekly slot:', error);
        throw error;
    }
}

/**
 * Toggle availability for a specific slot
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function toggleSlotAvailability(id) {
    try {
        const response = await api.post(`/availability/weekly/${id}/toggle_availability/`);
        return {
            id: response.id,
            caregiverId: response.caregiver,
            dayOfWeek: response.day_of_week,
            dayDisplay: response.day_display,
            startTime: response.start_time,
            endTime: response.end_time,
            isAvailable: response.is_available,
            notes: response.notes || ''
        };
    } catch (error) {
        console.error('Failed to toggle slot availability:', error);
        throw error;
    }
}

/**
 * Get caregiver's full weekly schedule
 * @returns {Promise<Array>}
 */
export async function getMySchedule() {
    try {
        const response = await api.get('/availability/weekly/my_schedule/');
        return response.map(slot => ({
            id: slot.id,
            caregiverId: slot.caregiver,
            dayOfWeek: slot.day_of_week,
            dayDisplay: slot.day_display,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            notes: slot.notes || ''
        }));
    } catch (error) {
        console.error('Failed to fetch my schedule:', error);
        throw error;
    }
}

/**
 * List specific date availability/unavailability
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function listSpecificDateAvailability(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.caregiver_id) queryParams.append('caregiver_id', params.caregiver_id);
        
        const url = `/availability/specific/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const raw = await api.get(url);
        const data = Array.isArray(raw) ? raw : (Array.isArray(raw.results) ? raw.results : []);
        
        return data.map(slot => ({
            id: slot.id,
            caregiverId: slot.caregiver,
            caregiverName: slot.caregiver_name,
            date: slot.date,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            reason: slot.reason || '',
            notes: slot.notes || '',
            appointment: slot.appointment,
            appointmentDetails: slot.appointment_details,
            createdAt: slot.created_at,
            updatedAt: slot.updated_at
        }));
    } catch (error) {
        console.error('Failed to fetch specific date availability:', error);
        throw error;
    }
}

/**
 * Mark a specific date/time as unavailable
 * @param {Object} data - { date, startTime, endTime, reason }
 * @returns {Promise<Object>}
 */
export async function markUnavailable(data) {
    try {
        const payload = {
            date: data.date,
            start_time: data.startTime,
            end_time: data.endTime,
            reason: data.reason || ''
        };
        
        const response = await api.post('/availability/specific/mark_unavailable/', payload);
        return {
            id: response.id,
            caregiverId: response.caregiver,
            date: response.date,
            startTime: response.start_time,
            endTime: response.end_time,
            isAvailable: response.is_available,
            reason: response.reason || ''
        };
    } catch (error) {
        console.error('Failed to mark unavailable:', error);
        throw error;
    }
}

/**
 * Get upcoming specific date availability
 * @returns {Promise<Array>}
 */
export async function getUpcomingAvailability() {
    try {
        const response = await api.get('/availability/specific/upcoming/');
        return response.map(slot => ({
            id: slot.id,
            caregiverId: slot.caregiver,
            date: slot.date,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            reason: slot.reason || '',
            appointment: slot.appointment
        }));
    } catch (error) {
        console.error('Failed to fetch upcoming availability:', error);
        throw error;
    }
}

/**
 * Delete a specific date availability entry
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteSpecificDateAvailability(id) {
    try {
        await api.delete(`/availability/specific/${id}/`);
    } catch (error) {
        console.error('Failed to delete specific date availability:', error);
        throw error;
    }
}
