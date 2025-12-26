// Runtime configuration template for Meetat frontend
// 
// INSTRUCTIONS:
// 1. Copy this file to config.js in the same directory
// 2. Update the API_URL and WS_URL values for your deployment
// 3. This file is loaded at runtime, so changes don't require a rebuild
//
// For Railway deployment:
// - Set API_URL to your backend Railway URL (e.g., 'https://meetat-production.up.railway.app')
// - Set WS_URL to your backend WebSocket URL (use wss:// for secure WebSocket)
// - Leave as null to use build-time environment variables (VITE_API_URL, VITE_WS_URL)
//
// For local development:
// - Leave as null to use Vite proxy (recommended)
// - Or set to 'http://localhost:3001' if running backend separately

window.__APP_CONFIG__ = {
  // API base URL (without /api suffix)
  // Examples:
  //   Production: 'https://meetat-production.up.railway.app'
  //   Staging: 'https://meetat-staging.up.railway.app'
  //   Local: 'http://localhost:3001' (if not using Vite proxy)
  //   null: Use build-time VITE_API_URL or fallback to relative /api
  API_URL: null,
  
  // WebSocket URL (without /ws suffix)
  // Examples:
  //   Production: 'wss://meetat-production.up.railway.app'
  //   Staging: 'wss://meetat-staging.up.railway.app'
  //   Local: 'ws://localhost:3001' (if not using Vite proxy)
  //   null: Use build-time VITE_WS_URL or fallback
  WS_URL: null
};

