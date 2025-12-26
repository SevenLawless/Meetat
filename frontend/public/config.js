// Runtime configuration for Meetat frontend
// This file is loaded before the main app bundle and can be customized per deployment
// without requiring a rebuild.

window.__APP_CONFIG__ = {
  // API base URL (without /api suffix)
  // Set this to your backend URL, e.g., 'https://meetat-production.up.railway.app'
  // Leave as null to use build-time VITE_API_URL or fallback to relative /api
  API_URL: null,
  
  // WebSocket URL (without /ws suffix)
  // Set this to your backend WebSocket URL, e.g., 'wss://meetat-production.up.railway.app'
  // Leave as null to use build-time VITE_WS_URL or fallback
  WS_URL: null
};

