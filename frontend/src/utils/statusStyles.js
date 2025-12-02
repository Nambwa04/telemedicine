/**
 * Status Styles Utility.
 * Centralizes status labels, colors, and badge classes for consistency.
 * Supports appointments, requests, and medical conditions.
 */
// Centralized status style metadata for consistency across the app
// Provides: label, short (optional), theme color token, and badgeClass for styling

export const appointmentStatus = {
    scheduled: { label: 'Scheduled', color: 'info', badgeClass: 'badge-soft-info' },
    'in-progress': { label: 'In Progress', color: 'warning', badgeClass: 'badge-soft-warning' },
    completed: { label: 'Completed', color: 'success', badgeClass: 'badge-soft-success' },
    cancelled: { label: 'Cancelled', color: 'secondary', badgeClass: 'badge-soft-secondary' }
};

export const requestStatus = {
    new: { label: 'New', color: 'primary', badgeClass: 'badge-soft-primary pulse-badge' },
    accepted: { label: 'Accepted', color: 'info', badgeClass: 'badge-soft-info' },
    'in-progress': { label: 'In Progress', color: 'warning', badgeClass: 'badge-soft-warning' },
    completed: { label: 'Completed', color: 'success', badgeClass: 'badge-soft-success' },
    declined: { label: 'Declined', color: 'danger', badgeClass: 'badge-soft-danger' }
};

// General condition tags (can be expanded). Use neutral/semantic color mapping.
// Key should be lowercase for lookup simplicity.
export const conditionTags = {
    hypertension: { label: 'Hypertension', badgeClass: 'badge-soft-warning' },
    diabetes: { label: 'Diabetes', badgeClass: 'badge-soft-danger' },
    asthma: { label: 'Asthma', badgeClass: 'badge-soft-info' },
    'cardiac risk': { label: 'Cardiac Risk', badgeClass: 'badge-soft-danger' },
    recovering: { label: 'Recovering', badgeClass: 'badge-soft-success' },
    stable: { label: 'Stable', badgeClass: 'badge-soft-success' },
    monitoring: { label: 'Monitoring', badgeClass: 'badge-soft-warning' }
};

// Helper to safely resolve a status mapping
export function getStatusMeta(type, status) {
    const maps = { appointment: appointmentStatus, request: requestStatus };
    return maps[type]?.[status] || { label: status, color: 'secondary', badgeClass: 'badge-soft-secondary' };
}

// Helper for condition tag resolution
export function getConditionTag(condition) {
    if (!condition) return null;
    const key = condition.toLowerCase();
    return conditionTags[key] || { label: condition, badgeClass: 'badge-soft-secondary' };
}
