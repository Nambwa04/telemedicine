import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
    () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
    API_BASE
);

/**
 * Fetch current user's profile
 * @returns {Promise<Object>} User profile data
 */
export async function fetchUserProfile() {
    try {
        const data = await api.get('/accounts/me/');
        return {
            id: data.id,
            email: data.email,
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
            role: data.role,
            primaryCondition: data.primary_condition || '',
            phone: data.phone || '',
            dateOfBirth: data.date_of_birth || '',
            gender: data.gender || '',
            address: data.address || '',
            emergencyContact: {
                name: (data.emergency_contact && data.emergency_contact.name) || '',
                phone: (data.emergency_contact && data.emergency_contact.phone) || '',
                relationship: (data.emergency_contact && data.emergency_contact.relationship) || ''
            },
            // Add other fields as available from backend
        };
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        throw error;
    }
}

/**
 * Update current user's profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserProfile(profileData) {
    try {
        const payload = {};

        // Map frontend field names to backend field names
        if (profileData.firstName !== undefined) payload.first_name = profileData.firstName;
        if (profileData.lastName !== undefined) payload.last_name = profileData.lastName;
        if (profileData.primaryCondition !== undefined) payload.primary_condition = profileData.primaryCondition;
        if (profileData.phone !== undefined) payload.phone = profileData.phone;
        if (profileData.dateOfBirth !== undefined) payload.date_of_birth = profileData.dateOfBirth || null;
        if (profileData.gender !== undefined) payload.gender = profileData.gender;
        if (profileData.address !== undefined) payload.address = profileData.address;
        if (profileData.emergencyContact !== undefined) payload.emergency_contact = {
            name: profileData.emergencyContact?.name || '',
            phone: profileData.emergencyContact?.phone || '',
            relationship: profileData.emergencyContact?.relationship || ''
        };

        const data = await api.patch('/accounts/me/', payload);

        return {
            id: data.id,
            email: data.email,
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
            role: data.role,
            primaryCondition: data.primary_condition || '',
            phone: data.phone || '',
            dateOfBirth: data.date_of_birth || '',
            gender: data.gender || '',
            address: data.address || '',
            emergencyContact: {
                name: (data.emergency_contact && data.emergency_contact.name) || '',
                phone: (data.emergency_contact && data.emergency_contact.phone) || '',
                relationship: (data.emergency_contact && data.emergency_contact.relationship) || ''
            },
        };
    } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
    }
}

/**
 * Change user password
 * @param {Object} passwordData - Password change data
 * @returns {Promise<Object>} Success message
 */
export async function changePassword(passwordData) {
    try {
        // TODO: Backend needs a password change endpoint
        // For now, throw an error to indicate it's not implemented
        throw new Error('Password change endpoint not yet implemented in backend');
    } catch (error) {
        console.error('Failed to change password:', error);
        throw error;
    }
}

/**
 * Delete user account
 * @returns {Promise<Object>} Success message
 */
export async function deleteAccount() {
    try {
        // TODO: Backend needs an account deletion endpoint
        // For now, throw an error to indicate it's not implemented
        throw new Error('Account deletion endpoint not yet implemented in backend');
    } catch (error) {
        console.error('Failed to delete account:', error);
        throw error;
    }
}
