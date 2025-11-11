// src/config.js
// Central API config & environment-aware helpers.
// Implements Create React App's built-in NODE_ENV behavior:
//   development: when running `npm start`
//   test:        when running `npm test`
//   production:  when running `npm run build`
// NODE_ENV cannot be overridden manually (CRA safety feature).

const ENV = process.env.NODE_ENV; // 'development' | 'test' | 'production'
export const IS_DEV = ENV === 'development';
export const IS_TEST = ENV === 'test';
export const IS_PROD = ENV === 'production';

// Determine API base:
// Use environment-specific variables for clarity:
//   - REACT_APP_API_BASE_LOCAL for development/test
//   - REACT_APP_API_BASE_PROD for production
// Fallbacks remain the same-origin '/api' in production and local Django in dev.
const API_BASE = IS_PROD
    ? (process.env.REACT_APP_API_BASE_PROD || '/api')
    : (process.env.REACT_APP_API_BASE_LOCAL || 'http://127.0.0.1:8000/api');

// Google OAuth Client ID
// Get this from Google Cloud Console: https://console.cloud.google.com/
// Provide via REACT_APP_GOOGLE_CLIENT_ID for secure environments; fallback only for dev convenience.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Debug logging helper: stripped / no-op in production builds (tree-shaking friendly if minified).
export function debugLog(...args) {
    if (IS_PROD) return; // avoid noisy logs in production
    // eslint-disable-next-line no-console
    console.log('[DEBUG]', ...args);
}

// Feature flags (extend as needed); these can be toggled via env vars at build time.
export const FEATURES = {
    enableVitalsExperimental: process.env.REACT_APP_ENABLE_VITALS_EXPERIMENTAL === 'true' && !IS_PROD,
};

// Optional: warn in development if using fallback API base.
if (IS_DEV && !process.env.REACT_APP_API_BASE_LOCAL) {
    // eslint-disable-next-line no-console
    console.info('[config] Using default local API base:', API_BASE);
}

export default API_BASE;
