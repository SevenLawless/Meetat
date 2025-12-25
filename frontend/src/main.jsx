import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import './index.css'

// Suppress Google Analytics errors from ad blockers
if (typeof window !== 'undefined') {
  // Suppress console errors for Google Analytics
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    // Suppress Google Analytics blocked errors
    if (message.includes('google-analytics') || 
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('mp/collect') ||
        message.includes('G-03XW3FWG7L')) {
      return; // Silently ignore
    }
    originalError.apply(console, args);
  };

  // Suppress network errors for Google Analytics by intercepting fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    // If it's a Google Analytics request, catch and ignore errors
    if (typeof url === 'string' && url.includes('google-analytics.com')) {
      return originalFetch.apply(this, args).catch(() => {
        // Silently ignore Google Analytics fetch errors
        return new Response(null, { status: 0, statusText: 'Blocked by client' });
      });
    }
    return originalFetch.apply(this, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

