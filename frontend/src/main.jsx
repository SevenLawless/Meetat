import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import './index.css'

// Suppress Google Analytics errors from ad blockers
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    // Suppress Google Analytics blocked errors
    if (message.includes('google-analytics') || 
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('mp/collect')) {
      return; // Silently ignore
    }
    originalError.apply(console, args);
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

