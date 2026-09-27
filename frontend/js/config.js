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
  REQUEST_TIMEOUT_MS: 30000,

  // Set to true to print verbose network logs to the browser console
  DEBUG: false
};

// Expose helper functions for dynamic backend switching
window.SkyResQConfig = {
  /**
   * Returns the currently configured backend URL.
   */
  getBackendUrl() {
    // 1. Explicit query string override (?api=http://... or ?api=https://...)
    try {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api');
      if (queryApi && queryApi.trim()) {
        const cleaned = queryApi.trim().replace(/\/+$/, '');
        try { localStorage.setItem('skyresq_backend_url', cleaned); } catch (e) {}
        return cleaned;
      }
    } catch (e) {}

    // 2. Intelligent local & LAN detection
    // If running on localhost, 127.0.0.1, or local Wi-Fi LAN IP, ALWAYS connect to local FastAPI port 8000!
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      const protocol = window.location.protocol || 'http:';

      const isLocalHost = (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname.endsWith('.local')
      );

      if (isLocalHost) {
        // Connect to FastAPI on port 8000 on the same machine/host
        return `${protocol}//${hostname}:8000`;
      }
    }

    // 3. Check localStorage for cloud deployments
    try {
      const stored = localStorage.getItem('skyresq_backend_url');
      if (stored && stored.trim() && !stored.includes('localhost') && !stored.includes('127.0.0.1')) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch (e) {}

    // 4. Default to deployed Render Backend URL on cloud (Vercel)
    if (window.__SKYRESQ_CONFIG__ && window.__SKYRESQ_CONFIG__.BACKEND_URL) {
      const cleaned = window.__SKYRESQ_CONFIG__.BACKEND_URL.trim().replace(/\/+$/, '');
      if (cleaned) return cleaned;
    }

    // 5. Check legacy global
    if (window.__SKYRESQ_API_URL__) {
      return window.__SKYRESQ_API_URL__.replace(/\/+$/, '');
    }

    return 'https://skyresq-backend-lrkd.onrender.com';
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
