#!/usr/bin/env node

/**
 * Generate config.js from environment variables
 * This script creates a runtime configuration file that can be customized
 * without requiring a rebuild of the frontend application.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');
const configPath = join(publicDir, 'config.js');

// Get API URL from environment (VITE_API_URL or API_URL)
const apiUrl = process.env.VITE_API_URL || process.env.API_URL || null;
const wsUrl = process.env.VITE_WS_URL || process.env.WS_URL || null;

// Helper to safely escape URLs for JavaScript string literals
const escapeUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/$/, '').replace(/'/g, "\\'");
};

// Generate config.js content
const configContent = `// Runtime configuration for Meetat frontend
// This file is auto-generated from environment variables during build
// You can manually edit this file to override values if needed

window.__APP_CONFIG__ = {
  // API base URL (without /api suffix)
  // Set this to your backend URL, e.g., 'https://meetat-production.up.railway.app'
  // Leave as null to use build-time VITE_API_URL or fallback to relative /api
  API_URL: ${apiUrl ? `'${escapeUrl(apiUrl)}'` : 'null'},
  
  // WebSocket URL (without /ws suffix)
  // Set this to your backend WebSocket URL, e.g., 'wss://meetat-production.up.railway.app'
  // Leave as null to use build-time VITE_WS_URL or fallback
  WS_URL: ${wsUrl ? `'${escapeUrl(wsUrl)}'` : 'null'}
};
`;

try {
  writeFileSync(configPath, configContent, 'utf8');
  console.log('✅ Generated config.js successfully');
  if (apiUrl) {
    console.log(`   API_URL: ${apiUrl}`);
  } else {
    console.log('   API_URL: null (will use build-time config or fallback)');
  }
  if (wsUrl) {
    console.log(`   WS_URL: ${wsUrl}`);
  } else {
    console.log('   WS_URL: null (will use build-time config or fallback)');
  }
} catch (error) {
  console.error('❌ Failed to generate config.js:', error.message);
  process.exit(1);
}

