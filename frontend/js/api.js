/**
 * SkyResQ Independent - Frontend API Client
 * 
 * Reusable communication layer for connecting the dashboard to the
 * local FastAPI backend running at http://127.0.0.1:8000.
 * 
 * Handles:
 * - Successful responses with JSON payload extraction
 * - Network failures and backend unavailability detection
 * - Request timeouts via AbortController
 * - Unified aggregated data fetching for dashboard synchronisation
 */

const SkyResQAPI = (() => {
  // Dynamically resolve API Base URL (auto-adapts for localhost, 127.0.0.1, LAN IP, unified port, or cloud deployments)
  const getBaseUrl = () => {
    // 1. If helper exists on window, use it
    if (typeof window !== 'undefined' && window.SkyResQConfig && typeof window.SkyResQConfig.getBackendUrl === 'function') {
      const url = window.SkyResQConfig.getBackendUrl();
      if (url) return url;
    }

    if (typeof window !== 'undefined' && window.location) {
      if (window.__SKYRESQ_API_URL__) return window.__SKYRESQ_API_URL__.replace(/\/+$/, '');
      if (window.__SKYRESQ_CONFIG__ && window.__SKYRESQ_CONFIG__.BACKEND_URL) {
        return window.__SKYRESQ_CONFIG__.BACKEND_URL.replace(/\/+$/, '');
      }

      // Check URL query parameters: ?api=https://...
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('api')) return urlParams.get('api').replace(/\/+$/, '');

      // Check localStorage for persisted user backend
      try {
        const stored = localStorage.getItem('skyresq_backend_url');
        if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
      } catch (e) {}

      const protocol = window.location.protocol || 'http:';
      const hostname = window.location.hostname || '127.0.0.1';
      const port = window.location.port;

      // Standalone frontend servers (8080, 5500, 3000, 5173) connect to backend on 8000
      if (port === '8080' || port === '5500' || port === '3000' || port === '5173') {
        return `${protocol}//${hostname}:8000`;
      }
      // Running directly on backend (port 8000)
      if (port === '8000') {
        return `${protocol}//${hostname}:8000`;
      }
      // Standard HTTP/HTTPS production deployment (port 80, 443, or cloud domain without port)
      if (!port || port === '80' || port === '443') {
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
      }
      return `${protocol}//${hostname}:8000`;
    }
    return 'http://127.0.0.1:8000';
  };

  let currentBaseUrl = getBaseUrl();

  const setBaseUrl = (newUrl) => {
    if (typeof newUrl === 'string') {
      currentBaseUrl = newUrl.trim().replace(/\/+$/, '');
      try { localStorage.setItem('skyresq_backend_url', currentBaseUrl); } catch (e) {}
    } else {
      currentBaseUrl = getBaseUrl();
    }
  };

  const getEffectiveBaseUrl = () => currentBaseUrl || getBaseUrl();

  const DEFAULT_TIMEOUT_MS = 8000;

  // Registered Backend Endpoints
  const ENDPOINTS = {
    HEALTH: '/health',
    SYSTEM_INFO: '/api/v1/system/info',
    DRONE_STATUS: '/api/v1/drone/status',
    DRONE_CONNECT: '/api/v1/drone/connect',
    DRONE_DISCONNECT: '/api/v1/drone/disconnect',
    DRONE_ARM: '/api/v1/drone/arm',
    DRONE_MODE: '/api/v1/drone/mode',
    DRONE_OVERRIDE_TELEMETRY: '/api/v1/drone/telemetry/override',
    MISSION_CURRENT: '/api/v1/mission/current',
    DETECTION_SUMMARY: '/api/v1/detection/summary',
    DETECTION_IMAGE: '/api/v1/detection/image',
    DETECTION_HEALTH: '/api/v1/detection/health',
    DETECTION_HISTORY: '/api/v1/detection/history',
    DETECTION_CLEAR: '/api/v1/detection/clear',
    MEDIA_STATUS: '/api/v1/media/status',
    DB_STATUS: '/api/v1/db/status',
    DB_EXPORT: '/api/v1/db/export',
    DB_CLEAR: '/api/v1/db/clear',
    REMOTE_CAMERA_LATEST: '/api/v1/remote-camera/latest',
    REMOTE_CAMERA_STATUS: '/api/v1/remote-camera/status',
    REMOTE_CAMERA_FRAME: '/api/v1/remote-camera/frame',
    AUTH_LOGIN_CHECK: '/api/v1/auth/login-check',
    AUTH_SEND_OTP: '/api/v1/auth/send-otp',
    AUTH_VERIFY_OTP: '/api/v1/auth/verify-otp',
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_FORGOT_REQUEST: '/api/v1/auth/forgot-password/request',
    AUTH_FORGOT_RESET: '/api/v1/auth/forgot-password/reset',
    AUTH_USERS: '/api/v1/auth/users',
    AUTH_SMTP_STATUS: '/api/v1/auth/smtp-status',
    AUTH_SMTP_CONFIG: '/api/v1/auth/smtp-config',
    DB_RECENT_DETECTIONS: '/api/v1/db/detections'
  };


  /**
   * Safe fetch wrapper with timeout and standardized response formatting.
   * @param {string} endpoint - Relative API endpoint path
   * @param {RequestInit} [options={}] - Standard fetch options
   * @returns {Promise<{success: boolean, data: any, error: string|null, isBackendDown: boolean, status: number}>}
   */
  async function apiRequest(endpoint, options = {}) {
    const base = getEffectiveBaseUrl();
    const url = `${base}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = `HTTP Error ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.detail) {
            errorDetails = errorJson.detail;
          }
        } catch (_) {
          // Fallback to status text if response is not JSON
          errorDetails = response.statusText || errorDetails;
        }

        return {
          success: false,
          data: null,
          error: errorDetails,
          isBackendDown: false,
          status: response.status
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data || {},
        error: null,
        isBackendDown: false,
        status: response.status
      };
    } catch (err) {
      clearTimeout(timeoutId);

      const isTimeout = err.name === 'AbortError';
      const errorMessage = isTimeout
        ? `Request timed out after ${DEFAULT_TIMEOUT_MS}ms`
        : `Backend unreachable (${err.message || 'Connection refused'})`;

      return {
        success: false,
        data: null,
        error: errorMessage,
        isBackendDown: true,
        status: 0
      };
    }
  }

  return {
    get BASE_URL() { return getEffectiveBaseUrl(); },
    getBaseUrl: getEffectiveBaseUrl,
    setBaseUrl,
    ENDPOINTS,

    /**
     * Check backend health and operational mode
     */
    async checkHealth() {
      return await apiRequest(ENDPOINTS.HEALTH);
    },

    /**
     * Fetch service information, version, and operational mode
     */
    async getSystemInfo() {
      return await apiRequest(ENDPOINTS.SYSTEM_INFO);
    },

    /**
     * Fetch drone avionics, battery, GPS coordinates, and flight status
     */
    async getDroneStatus() {
      return await apiRequest(ENDPOINTS.DRONE_STATUS);
    },

    /**
     * Connect to drone via specified protocol (SIMULATION, MAVLINK_SERIAL, MAVLINK_UDP, DEVICE_GPS_SYNC)
     */
    async connectDrone(config = {}) {
      return await apiRequest(ENDPOINTS.DRONE_CONNECT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: config.protocol || 'SIMULATION',
          target: config.target || null,
          baudrate: config.baudrate || 57600
        })
      });
    },

    /**
     * Disconnect active drone telemetry link
     */
    async disconnectDrone() {
      return await apiRequest(ENDPOINTS.DRONE_DISCONNECT, {
        method: 'POST'
      });
    },

    /**
     * Arm or disarm drone propulsion motors
     */
    async armDrone(armed = true) {
      return await apiRequest(ENDPOINTS.DRONE_ARM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed })
      });
    },

    /**
     * Set active drone flight mode (STANDBY, AUTO-SEARCH, LOITER, RTL, LAND)
     */
    async setFlightMode(flight_mode = 'AUTO-SEARCH') {
      return await apiRequest(ENDPOINTS.DRONE_MODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_mode })
      });
    },

    /**
     * Override drone telemetry with real device GPS coordinates
     */
    async overrideTelemetry(coords = {}) {
      return await apiRequest(ENDPOINTS.DRONE_OVERRIDE_TELEMETRY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude_meters: coords.altitude_meters,
          speed_meters_per_second: coords.speed_meters_per_second,
          heading_degrees: coords.heading_degrees
        })
      });
    },

    /**
     * Fetch current active/standby mission details
     */
    async getCurrentMission() {
      return await apiRequest(ENDPOINTS.MISSION_CURRENT);
    },

    /**
     * Fetch victim and hazard detection summary
     */
    async getDetectionSummary() {
      return await apiRequest(ENDPOINTS.DETECTION_SUMMARY);
    },

    /**
     * Upload an image for YOLO inference and receive structured detections + annotated URL
     * @param {File|Blob} file - Image file or captured canvas blob
     * @param {number} confThreshold - Confidence threshold (0.05 - 1.0)
     * @param {number} [latitude] - Optional GPS latitude
     * @param {number} [longitude] - Optional GPS longitude
     */
    async uploadDetectionImage(file, confThreshold = 0.25, latitude = null, longitude = null) {
      const url = `${BASE_URL}${ENDPOINTS.DETECTION_IMAGE}`;
      const formData = new FormData();
      formData.append('file', file, file.name || 'webcam_frame.jpg');
      formData.append('conf_threshold', confThreshold.toString());
      if (latitude !== null && latitude !== undefined) {
        formData.append('latitude', latitude.toString());
      }
      if (longitude !== null && longitude !== undefined) {
        formData.append('longitude', longitude.toString());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for AI inference

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorDetails = `HTTP Error ${response.status}`;
          try {
            const errorJson = await response.json();
            if (errorJson.detail) errorDetails = errorJson.detail;
          } catch (_) {
            errorDetails = response.statusText || errorDetails;
          }
          return { success: false, data: null, error: errorDetails, status: response.status };
        }

        const data = await response.json();
        return { success: true, data: data, error: null, status: response.status };
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError';
        return {
          success: false,
          data: null,
          error: isTimeout ? 'AI inference timed out after 35s' : `Backend unreachable (${err.message})`,
          isBackendDown: true,
          status: 0
        };
      }
    },

    /**
     * Retrieve health and model readiness status for YOLO service
     */
    async getDetectionHealth() {
      return await apiRequest(ENDPOINTS.DETECTION_HEALTH);
    },

    /**
     * Retrieve recent detection history records
     * @param {number} limit - Max records to return
     */
    async getDetectionHistory(limit = 20) {
      return await apiRequest(`${ENDPOINTS.DETECTION_HISTORY}?limit=${limit}`);
    },

    /**
     * Clear all recorded detections, casualties, and targets
     */
    async clearDetections() {
      return await apiRequest(ENDPOINTS.DETECTION_CLEAR, { method: 'POST' });
    },

    /**
     * Delete a single detection run and its captured image from disk
     * @param {string} imageId - Unique ID of the detection image run
     */
    async deleteDetectionRun(imageId) {
      return await apiRequest(`${ENDPOINTS.DETECTION_HISTORY}/${encodeURIComponent(imageId)}`, { method: 'DELETE' });
    },

    /**
     * Clear all detection history records and captured images from disk
     */
    async clearDetectionHistory() {
      return await apiRequest(ENDPOINTS.DETECTION_HISTORY, { method: 'DELETE' });
    },

    /**
     * Fetch optical RGB and thermal camera feed statuses
     */
    async getMediaStatus() {
      return await apiRequest(ENDPOINTS.MEDIA_STATUS);
    },

    /**
     * Fetch persistent SQLite database storage metrics & table counts
     */
    async getDbStatus() {
      return await apiRequest(ENDPOINTS.DB_STATUS);
    },

    /**
     * Export complete project database as JSON
     */
    async getDbExport() {
      return await apiRequest(ENDPOINTS.DB_EXPORT);
    },

    /**
     * Clear persisted detections from database
     */
    async clearDatabase() {
      return await apiRequest(ENDPOINTS.DB_CLEAR, { method: 'POST' });
    },

    /**
     * Fetch status of connected remote mobile camera nodes
     */
    async getRemoteCameraStatus() {
      return await apiRequest(ENDPOINTS.REMOTE_CAMERA_STATUS);
    },

    /**
     * Fetch latest frame and YOLO detection result from mobile phone camera
     */
    async getRemoteCameraLatest() {
      return await apiRequest(ENDPOINTS.REMOTE_CAMERA_LATEST);
    },

    /**
     * Strict operator password validation
     */
    async checkCredentials(email, password, mobile = null) {
      return await apiRequest(ENDPOINTS.AUTH_LOGIN_CHECK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mobile })
      });
    },

    /**
     * Dispatches real-time dynamic 2FA OTP
     */
    async sendOtp(email, mobile = null, channel = 'email') {
      return await apiRequest(ENDPOINTS.AUTH_SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, channel })
      });
    },

    /**
     * Validates 4-digit OTP code
     */
    async verifyOtp(identifier, otpCode) {
      return await apiRequest(ENDPOINTS.AUTH_VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp_code: otpCode })
      });
    },

    /**
     * Register a new operator account into database
     */
    async registerOperator(fullName, email, mobileOrRole, roleOrPw, passwordOrUser, username) {
      // Support both signatures:
      // 1. (fullName, email, mobile, role, password, username)
      // 2. (fullName, email, role, password, username)
      let mobile = null;
      let role = roleOrPw;
      let password = passwordOrUser;
      let user = username;

      if (username === undefined && passwordOrUser !== undefined) {
        // Called without mobile: (fullName, email, role, password, username)
        role = mobileOrRole;
        password = roleOrPw;
        user = passwordOrUser;
      } else {
        mobile = mobileOrRole || null;
      }

      return await apiRequest(ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          mobile: mobile || undefined,
          role: role || 'TACTICAL UAV PILOT',
          password,
          username: user || undefined
        })
      });
    },

    /**
     * Request forgot password verification code sent to mail ID
     */
    async requestPasswordReset(email) {
      return await apiRequest(ENDPOINTS.AUTH_FORGOT_REQUEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    },

    /**
     * Reset operator password directly
     */
    async resetPassword(email, newPassword) {
      return await apiRequest(ENDPOINTS.AUTH_FORGOT_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          new_password: newPassword
        })
      });
    },

    /**
     * Retrieve list of registered operators
     */
    async listOperators() {
      return await apiRequest(ENDPOINTS.AUTH_USERS);
    },

    /**
     * Check if email SMTP gateway is configured
     */
    async getSmtpStatus() {
      return await apiRequest(ENDPOINTS.AUTH_SMTP_STATUS);
    },

    /**
     * Configure email SMTP credentials for real inbox delivery
     */
    async configureSmtp(smtpUser, smtpPass, smtpHost = 'smtp.gmail.com', smtpPort = 587) {
      return await apiRequest(ENDPOINTS.AUTH_SMTP_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort, 10) || 587,
          smtp_user: smtpUser,
          smtp_pass: smtpPass
        })
      });
    },

    /**
     * Retrieve recent detections from database
     */
    async getRecentDetections(limit = 50, className = null) {
      const q = new URLSearchParams({ limit: String(limit) });
      if (className) q.append('class_name', className);
      return await apiRequest(`${ENDPOINTS.DB_RECENT_DETECTIONS}?${q.toString()}`);
    },



    /**
     * Aggregated fetch: Calls all backend endpoints concurrently and returns
     * a synchronized dashboard telemetry snapshot.
     */
    async fetchAllDashboardData() {
      const results = await Promise.allSettled([
        apiRequest(ENDPOINTS.HEALTH),
        apiRequest(ENDPOINTS.SYSTEM_INFO),
        apiRequest(ENDPOINTS.DRONE_STATUS),
        apiRequest(ENDPOINTS.MISSION_CURRENT),
        apiRequest(ENDPOINTS.DETECTION_SUMMARY),
        apiRequest(ENDPOINTS.MEDIA_STATUS)
      ]);

      const [
        healthRes,
        systemRes,
        droneRes,
        missionRes,
        detectionRes,
        mediaRes
      ] = results.map(r => r.status === 'fulfilled' ? r.value : {
        success: false,
        data: null,
        error: 'Promise rejected',
        isBackendDown: true,
        status: 0
      });

      // Backend is considered connected if health or system endpoints responded successfully
      const isConnected = healthRes.success || systemRes.success || droneRes.success;

      return {
        isConnected,
        timestamp: new Date(),
        health: healthRes,
        system: systemRes,
        drone: droneRes,
        mission: missionRes,
        detection: detectionRes,
        media: mediaRes,
        errors: [
          healthRes.error,
          systemRes.error,
          droneRes.error,
          missionRes.error,
          detectionRes.error,
          mediaRes.error
        ].filter(Boolean)
      };
    }
  };
})();

// Export globally for browser scripts and optionally for module environments
if (typeof window !== 'undefined') {
  window.SkyResQAPI = SkyResQAPI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkyResQAPI;
}
