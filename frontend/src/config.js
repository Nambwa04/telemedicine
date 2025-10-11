// src/config.js
// Central API config for frontend-backend connection

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000/api';

// Google OAuth Client ID
// Get this from Google Cloud Console: https://console.cloud.google.com/
// For development, you can use this test client ID (replace with your own)
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export default API_BASE;
