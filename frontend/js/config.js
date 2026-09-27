/**
 * ==============================================================================
 * SkyResQ Frontend Cloud & Mission Control Configuration
 * ==============================================================================
 * 
 * Configure how the Vercel-deployed frontend communicates with the
 * Render-deployed backend.
 * 
 * Priority order for resolving Backend URL:
 *   1. URL Parameter: ?api=https://your-backend.onrender.com
 *   2. LocalStorage:  localStorage.getItem('skyresq_backend_url')
 *   3. Config Object: window.__SKYRESQ_CONFIG__.BACKEND_URL (set below)
 *   4. Same-origin fallback / localhost:8000
 */

window.__SKYRESQ_CONFIG__ = {
  // 🚀 Deployed Render Backend URL
  BACKEND_URL: "https://skyresq-backend-lrkd.onrender.com",

  // Timeout for API requests in milliseconds
  REQUEST_TIMEOUT_MS: 10000,

  // Set to true to print verbose network logs to the browser console
  DEBUG: false
};

// Expose helper functions for dynamic backend switching
window.SkyResQConfig = {
  /**
   * Returns the currently configured backend URL.
   */
  getBackendUrl() {
    // 1. Check URL query string
    try {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api');
      if (queryApi && queryApi.trim()) {
        const cleaned = queryApi.trim().replace(/\/+$/, '');
        try { localStorage.setItem('skyresq_backend_url', cleaned); } catch (e) {}
        return cleaned;
      }
    } catch (e) {}

    // 2. Check localStorage
    try {
      const stored = localStorage.getItem('skyresq_backend_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch (e) {}

    // 3. Check config BACKEND_URL
    if (window.__SKYRESQ_CONFIG__ && window.__SKYRESQ_CONFIG__.BACKEND_URL) {
      const cleaned = window.__SKYRESQ_CONFIG__.BACKEND_URL.trim().replace(/\/+$/, '');
      if (cleaned) return cleaned;
    }

    // 4. Check legacy global
    if (window.__SKYRESQ_API_URL__) {
      return window.__SKYRESQ_API_URL__.replace(/\/+$/, '');
    }

    // 5. Intelligent host detection
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || '127.0.0.1';
    const port = window.location.port;

    // Local dev ports
    if (port === '8080' || port === '5500' || port === '3000' || port === '5173') {
      return `${protocol}//${hostname}:8000`;
    }
    if (port === '8000') {
      return `${protocol}//${hostname}:8000`;
    }

    // Default local fallback
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }

    // Deployed on Vercel without custom URL:
    // Return empty string to allow relative path rewrites or user prompt
    return '';
  },

  /**
   * Updates and persists the backend URL.
   * @param {string} url - The new backend URL (e.g. "https://skyresq-backend.onrender.com")
   */
  setBackendUrl(url) {
    if (!url || !url.trim()) {
      try { localStorage.removeItem('skyresq_backend_url'); } catch (e) {}
    } else {
      const cleaned = url.trim().replace(/\/+$/, '');
      try { localStorage.setItem('skyresq_backend_url', cleaned); } catch (e) {}
      if (window.__SKYRESQ_CONFIG__) {
        window.__SKYRESQ_CONFIG__.BACKEND_URL = cleaned;
      }
    }
    if (window.SkyResQAPI && typeof window.SkyResQAPI.setBaseUrl === 'function') {
      window.SkyResQAPI.setBaseUrl(url);
    }
  }
};
