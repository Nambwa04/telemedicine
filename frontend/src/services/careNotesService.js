/**
 * Service for managing care notes.
 * Handles CRUD operations, comments, pinning, archiving, and read status.
 */
import { createApiClient } from './apiClient';
import API_BASE from '../config';

const api = createApiClient(
  () => ({ user: JSON.parse(localStorage.getItem('user') || 'null'), refreshToken: async () => null }),
  API_BASE
);

/**
 * Get all care notes for a specific patient
 * @param {number} patientId - The patient's ID
 * @param {Object} filters - Optional filters { note_type, priority, is_archived }
 * @returns {Promise} - Array of care notes
 */
export const getCareNotesForPatient = async (patientId, filters = {}) => {
  const params = new URLSearchParams({ patient_id: patientId, ...filters });
  return await api.get(`/carenotes/?${params.toString()}`);
};

/**
 * Get unread care notes for the current user
 * @returns {Promise} - Array of unread care notes
 */
export const getUnreadCareNotes = async () => {
  return await api.get('/carenotes/unread/');
};

/**
 * Get a specific care note by ID
 * @param {number} noteId - The note's ID
 * @returns {Promise} - Care note details
 */
export const getCareNote = async (noteId) => {
  return await api.get(`/carenotes/${noteId}/`);
};

/**
 * Create a new care note
 * @param {Object} noteData - { patient, note_type, priority, content, is_pinned }
 * @returns {Promise} - Created care note
 */
export const createCareNote = async (noteData) => {
  return await api.post('/carenotes/', noteData);
};

/**
 * Update an existing care note
 * @param {number} noteId - The note's ID
 * @param {Object} noteData - Fields to update
 * @returns {Promise} - Updated care note
 */
export const updateCareNote = async (noteId, noteData) => {
  return await api.patch(`/carenotes/${noteId}/`, noteData);
};

/**
 * Delete a care note
 * @param {number} noteId - The note's ID
 * @returns {Promise}
 */
export const deleteCareNote = async (noteId) => {
  return await api.delete(`/carenotes/${noteId}/`);
};

/**
 * Mark a care note as read
 * @param {number} noteId - The note's ID
 * @returns {Promise}
 */
export const markCareNoteAsRead = async (noteId) => {
  return await api.post(`/carenotes/${noteId}/mark_read/`, {});
};

/**
 * Toggle pin status of a care note
 * @param {number} noteId - The note's ID
 * @returns {Promise} - { is_pinned: boolean }
 */
export const toggleCareNotePin = async (noteId) => {
  return await api.post(`/carenotes/${noteId}/toggle_pin/`, {});
};

/**
 * Archive a care note
 * @param {number} noteId - The note's ID
 * @returns {Promise}
 */
export const archiveCareNote = async (noteId) => {
  return await api.post(`/carenotes/${noteId}/archive/`, {});
};

/**
 * Unarchive a care note
 * @param {number} noteId - The note's ID
 * @returns {Promise}
 */
export const unarchiveCareNote = async (noteId) => {
  return await api.post(`/carenotes/${noteId}/unarchive/`, {});
};

/**
 * Add a comment to a care note
 * @param {number} noteId - The note's ID
 * @param {string} content - The comment content
 * @returns {Promise} - Created comment
 */
export const addCareNoteComment = async (noteId, content) => {
  return await api.post(`/carenotes/${noteId}/add_comment/`, { content });
};
