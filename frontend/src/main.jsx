import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import './index.css'

// Suppress Google Analytics errors from ad blockers
// This must be extremely aggressive because ad blockers block at the network level
// and browser consoles show these errors before JS can catch them in some cases
const suppressGA = () => {
  try {
    // 1. Suppress console.error
    const originalError = console.error;
    console.error = (...args) => {
      const message = (args[0] && typeof args[0] === 'string') ? args[0] : JSON.stringify(args);
      if (message.includes('google-analytics') || 
          message.includes('ERR_BLOCKED_BY_CLIENT') || 
          message.includes('mp/collect') ||
          message.includes('G-03XW3FWG7L')) {
        return;
      }
      originalError.apply(console, args);
    };

    // 2. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('google-analytics.com') || url.includes('mp/collect'))) {
        // Return a fake successful response immediately without making network request
        return Promise.resolve(new Response(null, { status: 200, statusText: 'OK' }));
      }
      return originalFetch.apply(this, args);
    };

    // 3. Intercept sendBeacon
    if (window.navigator && window.navigator.sendBeacon) {
      const originalSendBeacon = window.navigator.sendBeacon;
      window.navigator.sendBeacon = function(url, data) {
        if (typeof url === 'string' && (url.includes('google-analytics.com') || url.includes('mp/collect'))) {
          return true;
        }
        return originalSendBeacon.call(window.navigator, url, data);
      };
    }
    
    // 4. Intercept Image (pixel tracking)
    const OriginalImage = window.Image;
    window.Image = function() {
      const img = new OriginalImage();
      const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      
      Object.defineProperty(img, 'src', {
        set(value) {
          if (value && typeof value === 'string' && (value.includes('google-analytics.com') || value.includes('mp/collect'))) {
            // Do nothing, block the request
            return;
          }
          if (originalSrcDescriptor && originalSrcDescriptor.set) {
            originalSrcDescriptor.set.call(this, value);
          } else {
            this.setAttribute('src', value);
          }
        },
        get() {
          if (originalSrcDescriptor && originalSrcDescriptor.get) {
            return originalSrcDescriptor.get.call(this);
          }
          return this.getAttribute('src');
        }
      });
      return img;
    };
  } catch (e) {
    // Ignore errors in suppression logic
  }
};

if (typeof window !== 'undefined') {
  suppressGA();
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

