/**
 * ============================================================================
 * SkyResQ: AI-Powered Aerial Rescue & Situational Awareness System
 * Frontend Dashboard Telemetry Engine (FastAPI Client)
 * 
 * NOTE:
 * - This frontend connects directly to the local SkyResQ FastAPI backend.
 * - All telemetry data is explicitly flagged as [SIMULATION] data.
 * - No physical drone hardware or flight controller is connected.
 * ============================================================================
 */

// ============================================================================
// 1. API CONFIGURATION & ENDPOINT URLS
// ============================================================================
// Base URL pointing to the running local FastAPI backend instance
const API_BASE_URL = 'http://127.0.0.1:8000';

// API Endpoints mapped directly to backend routes:
const ENDPOINTS = {
  // GET /api/v1/telemetry/current -> Live simulated drone avionics snapshot
  CURRENT_TELEMETRY: `${API_BASE_URL}/api/v1/telemetry/current`,

  // GET /api/v1/telemetry/status -> Subsystem diagnostics & hardware readiness
  TELEMETRY_STATUS: `${API_BASE_URL}/api/v1/telemetry/status`,

  // GET /api/v1/detections/summary -> Situational awareness summary metrics
  DETECTIONS_SUMMARY: `${API_BASE_URL}/api/v1/detections/summary`,

  // GET /api/v1/detections -> Log of recent YOLO detections
  DETECTIONS_LIST: `${API_BASE_URL}/api/v1/detections`,

  // Video & Camera Ingestion Endpoints
  VIDEO_STATUS: `${API_BASE_URL}/api/v1/video/status`,
  VIDEO_SOURCE: `${API_BASE_URL}/api/v1/video/source`,
  VIDEO_START: `${API_BASE_URL}/api/v1/video/start`,
  VIDEO_STOP: `${API_BASE_URL}/api/v1/video/stop`,
  VIDEO_PROCESS_FRAME: `${API_BASE_URL}/api/v1/video/process-frame`
};

// Periodic polling configuration (1000 ms = 1.0 Hz query rate)
const POLLING_INTERVAL_MS = 1000;
let pollingTimerId = null;
let isInitialLoad = true;

// ============================================================================
// 2. CACHED DOM REFERENCES
// ============================================================================
const DOM = {
  // Status Bar Elements
  apiStatusPill: document.getElementById('apiStatusPill'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),
  btnRefresh: document.getElementById('btnRefresh'),
  refreshIcon: document.getElementById('refreshIcon'),
  liveUtcClock: document.getElementById('liveUtcClock'),
  lastSyncTime: document.getElementById('lastSyncTime'),

  // Error Banner Elements
  errorBanner: document.getElementById('errorBanner'),
  errorTitle: document.getElementById('errorTitle'),
  errorMessage: document.getElementById('errorMessage'),
  btnRetryConnection: document.getElementById('btnRetryConnection'),

  // Loading Overlay
  loadingOverlay: document.getElementById('loadingOverlay'),

  // 12 Telemetry Metric Card Value Elements
  valDroneId: document.getElementById('valDroneId'),
  valSimStatus: document.getElementById('valSimStatus'),
  valBatteryPercent: document.getElementById('valBatteryPercent'),
  barBatteryFill: document.getElementById('barBatteryFill'),
  valBatteryHealth: document.getElementById('valBatteryHealth'),
  valBatteryVoltage: document.getElementById('valBatteryVoltage'),
  valGpsSats: document.getElementById('valGpsSats'),
  barGpsFill: document.getElementById('barGpsFill'),
  valLatitude: document.getElementById('valLatitude'),
  valLongitude: document.getElementById('valLongitude'),
  valAltitude: document.getElementById('valAltitude'),
  barAltitudeFill: document.getElementById('barAltitudeFill'),
  valSpeed: document.getElementById('valSpeed'),
  valSpeedKmh: document.getElementById('valSpeedKmh'),
  valHeading: document.getElementById('valHeading'),
  valHeadingCardinal: document.getElementById('valHeadingCardinal'),
  valFlightMode: document.getElementById('valFlightMode'),
  valArmedStatus: document.getElementById('valArmedStatus'),
  badgeArmStatus: document.getElementById('badgeArmStatus'),
  valConnectionStatus: document.getElementById('valConnectionStatus'),

  // Tactical GPS Mission Map Elements
  btnCenterDrone: document.getElementById('btnCenterDrone'),
  btnToggleAutoPan: document.getElementById('btnToggleAutoPan'),
  textAutoPan: document.getElementById('textAutoPan'),
  btnToggleTrail: document.getElementById('btnToggleTrail'),
  textTrail: document.getElementById('textTrail'),
  mapHudCoords: document.getElementById('mapHudCoords'),
  mapHudHeading: document.getElementById('mapHudHeading'),
  mapHudAltitude: document.getElementById('mapHudAltitude'),
  mapHudSpeed: document.getElementById('mapHudSpeed'),

  // Diagnostics Section Elements
  diagSubsystemBadge: document.getElementById('diagSubsystemBadge'),
  diagProvider: document.getElementById('diagProvider'),
  diagMavlink: document.getElementById('diagMavlink'),
  diagHardware: document.getElementById('diagHardware'),
  diagGpsFix: document.getElementById('diagGpsFix'),
  diagAttitude: document.getElementById('diagAttitude'),
  diagMessage: document.getElementById('diagMessage'),

  // AI Detection & Situational Awareness Elements
  valTotalPersons: document.getElementById('valTotalPersons'),
  valTotalHazards: document.getElementById('valTotalHazards'),
  valLatestClass: document.getElementById('valLatestClass'),
  valLatestConfidence: document.getElementById('valLatestConfidence'),
  barLatestConfidence: document.getElementById('barLatestConfidence'),
  valLatestTime: document.getElementById('valLatestTime'),
  valLatestStatus: document.getElementById('valLatestStatus'),
  detectionTableBody: document.getElementById('detectionTableBody'),
  badgeDetectionSim: document.getElementById('badgeDetectionSim'),
  badgeDetectionIngest: document.getElementById('badgeDetectionIngest'),
  btnClearDetections: document.getElementById('btnClearDetections'),

  // Video Feed Panel Elements
  badgeVideoSourceType: document.getElementById('badgeVideoSourceType'),
  videoStatusIndicator: document.getElementById('videoStatusIndicator'),
  videoStatusDot: document.getElementById('videoStatusDot'),
  videoStatusText: document.getElementById('videoStatusText'),
  btnToggleVideoStream: document.getElementById('btnToggleVideoStream'),
  btnProcessSingleFrame: document.getElementById('btnProcessSingleFrame'),
  iconVideoToggle: document.getElementById('iconVideoToggle'),
  textVideoToggle: document.getElementById('textVideoToggle'),
  btnSourceSim: document.getElementById('btnSourceSim'),
  btnSourceVideo: document.getElementById('btnSourceVideo'),
  btnSourceWebcam: document.getElementById('btnSourceWebcam'),
  valVideoFps: document.getElementById('valVideoFps'),
  valVideoFrames: document.getElementById('valVideoFrames'),
  valVideoDetections: document.getElementById('valVideoDetections'),
  valActiveSource: document.getElementById('valActiveSource'),
  videoErrorAlert: document.getElementById('videoErrorAlert'),
  videoErrorMsg: document.getElementById('videoErrorMsg')
};

// ============================================================================
// 3. UTILITY FUNCTIONS (Cardinal Heading & Formatting)
// ============================================================================

/**
 * Converts degrees (0-360) into standard compass cardinal points.
 * @param {number} deg - Compass heading in degrees
 * @returns {string} - e.g. "N", "ENE", "WNW"
 */
function getCardinalDirection(deg) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

/**
 * Formats an ISO 8601 string into a local readable time string (HH:MM:SS).
 * @param {string} isoString - e.g. "2026-09-20T18:28:35.834233+00:00"
 * @returns {string} - e.g. "18:28:35 UTC"
 */
function formatTimestamp(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--:--';
    return d.toTimeString().split(' ')[0];
  } catch (e) {
    return '--:--:--';
  }
}

/**
 * Updates the live UTC clock in the navigation bar.
 */
function updateLiveClock() {
  const now = new Date();
  const utcString = now.toUTCString().split(' ')[4] + ' UTC';
  if (DOM.liveUtcClock) {
    DOM.liveUtcClock.textContent = utcString;
  }
}

// ============================================================================
// 4. TACTICAL GPS MISSION MAP ENGINE (Leaflet.js + OpenStreetMap)
// ============================================================================
class MapManager {
  constructor() {
    this.map = null;
    this.droneMarker = null;
    this.flightTrail = null;
    this.launchMarker = null;
    this.detectionMarkers = [];
    this.autoPan = true;
    this.showTrail = true;
    this.trailPoints = [];
    this.isInitialized = false;
  }

  init() {
    if (typeof L === 'undefined') {
      console.warn('[SkyResQ Map]: Leaflet library not loaded.');
      return;
    }

    const mapContainer = document.getElementById('telemetryMap');
    if (!mapContainer || this.map) return;

    // Sector 7B Default Position (Mount Wilson Search Zone)
    const initialPos = [34.2512, -118.1524];

    // 1. Initialize Leaflet Map
    this.map = L.map('telemetryMap', {
      center: initialPos,
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // 2. Add Tactical Dark Inversion OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'dark-tiles',
      maxZoom: 19
    }).addTo(this.map);

    // Zoom controls positioned at top-right
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // 3. Launch Point Marker (Sector 7B Base)
    const launchIcon = L.divIcon({
      className: 'custom-launch-pin',
      html: '<div class="launch-marker-icon" title="Sector 7B Launch Base">H</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    this.launchMarker = L.marker([34.2500, -118.1500], { icon: launchIcon }).addTo(this.map);
    this.launchMarker.bindPopup(`
      <div class="tactical-popup">
        <div class="popup-header"><i class="fa-solid fa-house"></i> SECTOR 7B LAUNCH BASE</div>
        <div class="popup-row"><span>STATUS:</span> <b>HOME WAYPOINT</b></div>
        <div class="popup-row"><span>COORDS:</span> <b>34.2500° N, 118.1500° W</b></div>
      </div>
    `);

    // 4. Flight Path Breadcrumb Trail Polyline (Cyan Glow)
    this.flightTrail = L.polyline([initialPos], {
      color: '#00f0ff',
      weight: 2.5,
      opacity: 0.85,
      dashArray: '4, 6'
    }).addTo(this.map);

    // 5. Custom Rotatable Drone Icon
    const droneIcon = L.divIcon({
      className: 'custom-drone-icon',
      html: `
        <div class="drone-icon-container" id="droneMarkerIcon">
          <img src="assets/drone-marker.svg" alt="SkyResQ Drone" />
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -22]
    });

    this.droneMarker = L.marker(initialPos, { icon: droneIcon }).addTo(this.map);
    this.droneMarker.bindPopup(this.createPopupContent(initialPos[0], initialPos[1], 48.2, 14.2, 284, 84.0));

    this.isInitialized = true;
  }

  createPopupContent(lat, lon, alt, speed, heading, battery) {
    return `
      <div class="tactical-popup">
        <div class="popup-header"><i class="fa-solid fa-helicopter"></i> SkyResQ-DRONE-01</div>
        <div class="popup-row"><span>STATUS:</span> <b style="color: var(--accent-emerald);">AUTONOMOUS</b></div>
        <div class="popup-row"><span>LAT / LON:</span> <b>${lat.toFixed(4)}°, ${lon.toFixed(4)}°</b></div>
        <div class="popup-row"><span>ALTITUDE:</span> <b>${alt.toFixed(1)} m AGL</b></div>
        <div class="popup-row"><span>SPEED:</span> <b>${speed.toFixed(1)} m/s</b></div>
        <div class="popup-row"><span>HEADING:</span> <b>${Math.round(heading)}° (${getCardinalDirection(heading)})</b></div>
        <div class="popup-row"><span>BATTERY:</span> <b style="color: var(--accent-cyan);">${battery.toFixed(0)}%</b></div>
      </div>
    `;
  }

  update(data) {
    if (!this.isInitialized || !this.map) return;

    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    const heading = Number(data.heading || 0);
    const alt = Number(data.altitude || 0);
    const speed = Number(data.speed || 0);
    const battery = Number(data.battery_percentage || 0);

    if (isNaN(lat) || isNaN(lon)) return;

    const currentPos = [lat, lon];

    // 1. Update Drone Marker Position
    this.droneMarker.setLatLng(currentPos);

    // 2. Rotate Drone Marker with Heading
    const iconEl = document.getElementById('droneMarkerIcon');
    if (iconEl) {
      iconEl.style.transform = `rotate(${heading}deg)`;
    }

    // 3. Update Popup Content
    this.droneMarker.setPopupContent(this.createPopupContent(lat, lon, alt, speed, heading, battery));

    // 4. Update Breadcrumb Trail
    if (this.showTrail) {
      this.trailPoints.push(currentPos);
      if (this.trailPoints.length > 250) this.trailPoints.shift();
      this.flightTrail.setLatLngs(this.trailPoints);
    }

    // 5. Auto-Pan to Drone
    if (this.autoPan) {
      this.map.panTo(currentPos, { animate: true, duration: 0.8 });
    }

    // 6. Update Floating Map HUD
    if (DOM.mapHudCoords) DOM.mapHudCoords.textContent = `${lat.toFixed(4)}° N, ${Math.abs(lon).toFixed(4)}° W`;
    if (DOM.mapHudHeading) DOM.mapHudHeading.innerHTML = `<i class="fa-solid fa-compass"></i> ${Math.round(heading)}° ${getCardinalDirection(heading)}`;
    if (DOM.mapHudAltitude) DOM.mapHudAltitude.textContent = `${alt.toFixed(1)} m AGL`;
    if (DOM.mapHudSpeed) DOM.mapHudSpeed.textContent = `${speed.toFixed(1)} m/s`;
  }

  centerOnDrone() {
    if (!this.droneMarker || !this.map) return;
    const pos = this.droneMarker.getLatLng();
    this.map.setView(pos, 16, { animate: true });
  }

  toggleAutoPan() {
    this.autoPan = !this.autoPan;
    if (DOM.btnToggleAutoPan) {
      DOM.btnToggleAutoPan.classList.toggle('active', this.autoPan);
      if (DOM.textAutoPan) {
        DOM.textAutoPan.textContent = `Auto-Center: ${this.autoPan ? 'ON' : 'OFF'}`;
      }
    }
  }

  toggleTrail() {
    this.showTrail = !this.showTrail;
    if (DOM.btnToggleTrail) {
      DOM.btnToggleTrail.classList.toggle('active', this.showTrail);
      if (DOM.textTrail) {
        DOM.textTrail.textContent = `Flight Trail: ${this.showTrail ? 'ON' : 'OFF'}`;
      }
    }
    if (this.flightTrail) {
      if (this.showTrail) {
        this.flightTrail.addTo(this.map);
      } else {
        this.flightTrail.remove();
      }
    }
  }

  /**
   * Renders and updates ground detection markers (victims, hazards) on the map.
   * @param {Array} detections - List of DetectionResponse objects from FastAPI
   */
  updateDetections(detections) {
    if (!this.isInitialized || !this.map || !Array.isArray(detections)) return;

    // Clear previous detection pins
    this.detectionMarkers.forEach(m => m.remove());
    this.detectionMarkers = [];

    // Filter detections that have coordinates
    detections.forEach(d => {
      const lat = Number(d.latitude);
      const lon = Number(d.longitude);
      if (isNaN(lat) || isNaN(lon) || !lat || !lon) return;

      const isPerson = ['person', 'survivor', 'casualty', 'human'].includes((d.class_name || '').toLowerCase());

      let icon;
      if (isPerson) {
        icon = L.divIcon({
          className: 'custom-victim-pin',
          html: `<img src="assets/victim-icon.svg" class="victim-marker-icon" title="${d.detection_id}: Person / Casualty (${(d.confidence * 100).toFixed(0)}%)" />`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -16]
        });
      } else {
        icon = L.divIcon({
          className: 'custom-hazard-pin',
          html: `<div class="hazard-marker-icon" title="${d.detection_id}: Hazard / Hotspot"><i class="fa-solid fa-triangle-exclamation"></i></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -14]
        });
      }

      const marker = L.marker([lat, lon], { icon }).addTo(this.map);
      marker.bindPopup(`
        <div class="tactical-popup">
          <div class="popup-header" style="color: ${isPerson ? 'var(--accent-rose)' : 'var(--accent-amber)'};">
            <i class="fa-solid ${isPerson ? 'fa-person-falling-burst' : 'fa-triangle-exclamation'}"></i> ${d.detection_id}
          </div>
          <div class="popup-row"><span>TARGET:</span> <b style="color: ${isPerson ? 'var(--accent-rose)' : 'var(--accent-amber)'};">${(d.class_name || 'UNKNOWN').toUpperCase()}</b></div>
          <div class="popup-row"><span>CONFIDENCE:</span> <b>${(Number(d.confidence || 0) * 100).toFixed(1)}%</b></div>
          <div class="popup-row"><span>COORDS:</span> <b>${lat.toFixed(4)}° N, ${Math.abs(lon).toFixed(4)}° W</b></div>
          <div class="popup-row"><span>STATUS:</span> <b style="color: var(--accent-emerald);">${d.status || 'CONFIRMED'}</b></div>
          <div class="popup-row"><span>SOURCE:</span> <b>${d.source_model || 'YOLOv8'}</b></div>
        </div>
      `);
      this.detectionMarkers.push(marker);
    });
  }
}

const mapManager = new MapManager();

// ============================================================================
// 5. TELEMETRY DATA FETCHING & MAPPING ENGINE
// ============================================================================

/**
 * Fetches current telemetry snapshot from FastAPI: GET /api/v1/telemetry/current
 * and status diagnostics from: GET /api/v1/telemetry/status
 */
async function fetchTelemetryData() {
  try {
    // Spin refresh icon on manual click
    if (DOM.refreshIcon) DOM.refreshIcon.classList.add('fa-spin');

    // Fetch current avionics, diagnostics, detections, and video status in parallel
    const [currentRes, statusRes, detSummaryRes, detListRes, videoStatusRes] = await Promise.all([
      fetch(ENDPOINTS.CURRENT_TELEMETRY, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }),
      fetch(ENDPOINTS.TELEMETRY_STATUS, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }),
      fetch(ENDPOINTS.DETECTIONS_SUMMARY, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }),
      fetch(ENDPOINTS.DETECTIONS_LIST, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }),
      fetch(ENDPOINTS.VIDEO_STATUS, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }).catch(() => null)
    ]);

    if (!currentRes.ok) {
      throw new Error(`Current telemetry endpoint returned HTTP status ${currentRes.status}`);
    }

    const currentData = await currentRes.json();
    const statusData = statusRes.ok ? await statusRes.json() : null;
    const detSummaryData = detSummaryRes.ok ? await detSummaryRes.json() : null;
    const detListData = detListRes.ok ? await detListRes.json() : [];
    const videoData = (videoStatusRes && videoStatusRes.ok) ? await videoStatusRes.json() : null;

    // Map telemetry data to dashboard cards
    renderTelemetryUI(currentData);

    // Map status diagnostics if available
    if (statusData) {
      renderDiagnosticsUI(statusData, currentData);
    }

    // Map detection situational awareness UI
    if (detSummaryData) {
      renderDetectionsUI(detSummaryData, detListData);
    }

    // Map video stream panel UI
    if (videoData) {
      renderVideoUI(videoData);
    }

    // Update Tactical GPS Map with real-time drone telemetry & detection markers
    mapManager.update(currentData);
    if (Array.isArray(detListData) && detListData.length > 0) {
      mapManager.updateDetections(detListData);
    }

    // Update connection status indicators to ONLINE
    setConnectionState(true);

  } catch (error) {
    console.error('[SkyResQ API Error]: Failed to fetch telemetry from backend:', error);
    setConnectionState(false, error.message);
  } finally {
    // Hide initial loading backdrop overlay after first fetch attempt
    if (DOM.loadingOverlay && isInitialLoad) {
      DOM.loadingOverlay.classList.add('hidden');
      isInitialLoad = false;
    }
    if (DOM.refreshIcon) DOM.refreshIcon.classList.remove('fa-spin');
  }
}

/**
 * Maps the 12 required telemetry fields from the backend response into DOM cards.
 * @param {Object} data - DroneTelemetryResponse model from FastAPI
 */
function renderTelemetryUI(data) {
  // 1. Drone ID
  if (DOM.valDroneId) DOM.valDroneId.textContent = data.drone_id || 'SkyResQ-DRONE-01';

  // 2. Simulation Status
  if (DOM.valSimStatus) DOM.valSimStatus.textContent = data.simulation_status || 'SIMULATION';

  // 3. Battery Percentage
  const battPercent = Number(data.battery_percentage || 0);
  if (DOM.valBatteryPercent) DOM.valBatteryPercent.textContent = `${battPercent.toFixed(1)}%`;
  if (DOM.barBatteryFill) {
    DOM.barBatteryFill.style.width = `${Math.min(100, Math.max(0, battPercent))}%`;
    DOM.barBatteryFill.className = 'progress-bar-fill';
    if (battPercent > 50) DOM.barBatteryFill.classList.add('emerald');
    else if (battPercent > 20) DOM.barBatteryFill.classList.add('amber');
    else DOM.barBatteryFill.classList.add('rose');
  }
  if (DOM.valBatteryHealth) {
    DOM.valBatteryHealth.textContent = battPercent > 20 ? 'Status: Nominal Draw' : 'Status: CRITICAL LOW CHARGE';
    DOM.valBatteryHealth.style.color = battPercent > 20 ? 'var(--text-muted)' : 'var(--accent-rose)';
  }

  // 4. Battery Voltage
  const volts = Number(data.battery_voltage || 0);
  if (DOM.valBatteryVoltage) DOM.valBatteryVoltage.textContent = `${volts.toFixed(1)} V`;

  // 5. GPS Satellites
  const sats = Number(data.gps_satellites || 0);
  if (DOM.valGpsSats) DOM.valGpsSats.textContent = `${sats} Sats`;
  if (DOM.barGpsFill) {
    // Normalized assuming 24 sats max
    DOM.barGpsFill.style.width = `${Math.min(100, (sats / 24) * 100)}%`;
  }

  // 6. Coordinates: Latitude and Longitude
  const lat = Number(data.latitude || 0);
  const lon = Number(data.longitude || 0);
  if (DOM.valLatitude) DOM.valLatitude.textContent = `${lat >= 0 ? lat.toFixed(6) + '° N' : Math.abs(lat).toFixed(6) + '° S'}`;
  if (DOM.valLongitude) DOM.valLongitude.textContent = `${lon >= 0 ? lon.toFixed(6) + '° E' : Math.abs(lon).toFixed(6) + '° W'}`;

  // 7. Altitude
  const alt = Number(data.altitude || 0);
  if (DOM.valAltitude) DOM.valAltitude.textContent = `${alt.toFixed(1)} m`;
  if (DOM.barAltitudeFill) {
    // Normalized to 100m AGL ceiling
    DOM.barAltitudeFill.style.width = `${Math.min(100, (alt / 100) * 100)}%`;
  }

  // 8. Ground Speed
  const speed = Number(data.speed || 0);
  const speedKmh = (speed * 3.6).toFixed(1);
  if (DOM.valSpeed) DOM.valSpeed.textContent = `${speed.toFixed(1)} m/s`;
  if (DOM.valSpeedKmh) DOM.valSpeedKmh.textContent = `${speedKmh} km/h • Cruise Velocity`;

  // 9. Heading
  const heading = Number(data.heading || 0);
  const cardinal = getCardinalDirection(heading);
  if (DOM.valHeading) DOM.valHeading.textContent = `${heading.toFixed(1)}°`;
  if (DOM.valHeadingCardinal) DOM.valHeadingCardinal.textContent = `Heading: ${cardinal} (${heading.toFixed(0)}°)`;

  // 10. Flight Mode
  if (DOM.valFlightMode) DOM.valFlightMode.textContent = data.flight_mode || 'AUTO-SEARCH GRID';

  // 11. Arm Status
  const isArmed = Boolean(data.armed_status);
  if (DOM.valArmedStatus) {
    DOM.valArmedStatus.textContent = isArmed ? 'ARMED' : 'DISARMED';
    DOM.valArmedStatus.style.color = isArmed ? 'var(--accent-emerald)' : 'var(--accent-amber)';
  }
  if (DOM.badgeArmStatus) {
    DOM.badgeArmStatus.textContent = isArmed ? 'Propellers Active' : 'Motors Powered Off';
    DOM.badgeArmStatus.className = `badge ${isArmed ? 'badge-emerald' : 'badge-amber'}`;
  }

  // 12. Connection Status
  if (DOM.valConnectionStatus) DOM.valConnectionStatus.textContent = data.connection_status || 'SIMULATED_LINK_ACTIVE';

  // Update Last Sync Clock
  if (DOM.lastSyncTime) {
    DOM.lastSyncTime.textContent = formatTimestamp(data.timestamp);
  }
}

/**
 * Maps subsystem diagnostic flags from /api/v1/telemetry/status.
 * @param {Object} status - TelemetryStatusResponse model
 * @param {Object} current - DroneTelemetryResponse model
 */
function renderDiagnosticsUI(status, current) {
  if (DOM.diagProvider) DOM.diagProvider.textContent = status.telemetry_source || 'Internal Python Simulation Generator';
  if (DOM.diagMavlink) {
    DOM.diagMavlink.textContent = status.mavlink_ready ? 'READY FOR HARDWARE (INGESTION HOOK)' : 'NOT READY';
  }
  if (DOM.diagHardware) {
    DOM.diagHardware.textContent = status.hardware_connected ? 'CONNECTED' : 'DISCONNECTED (SIMULATION)';
  }
  if (DOM.diagGpsFix) DOM.diagGpsFix.textContent = status.gps_fix || '3D_FIX (18 Sats Simulated)';
  if (DOM.diagMessage) DOM.diagMessage.textContent = status.message || 'Telemetry nominal.';

  // Attitude details from current reading
  if (DOM.diagAttitude && current) {
    DOM.diagAttitude.textContent = `Pitch: ${current.pitch}° | Roll: ${current.roll}° | Yaw: ${current.yaw}°`;
  }
}

/**
 * Maps detection summary metrics and detection log table from FastAPI.
 * @param {Object} summary - DetectionSummaryResponse from /api/v1/detections/summary
 * @param {Array} detections - List of DetectionResponse from /api/v1/detections
 */
function renderDetectionsUI(summary, detections) {
  if (DOM.valTotalPersons) {
    DOM.valTotalPersons.textContent = summary.total_persons ?? 0;
  }
  if (DOM.valTotalHazards) {
    DOM.valTotalHazards.textContent = summary.total_hazards ?? 0;
  }

  const latest = summary.latest_detection;
  if (latest) {
    if (DOM.valLatestClass) {
      DOM.valLatestClass.textContent = (latest.class_name || 'NONE').toUpperCase();
    }
    const conf = Number(latest.confidence || 0) * 100;
    if (DOM.valLatestConfidence) {
      DOM.valLatestConfidence.textContent = `${conf.toFixed(1)}% Confidence`;
    }
    if (DOM.barLatestConfidence) {
      DOM.barLatestConfidence.style.width = `${Math.min(100, Math.max(0, conf))}%`;
    }
    if (DOM.valLatestTime) {
      DOM.valLatestTime.textContent = `${formatTimestamp(latest.timestamp)} UTC`;
    }
    if (DOM.valLatestStatus) {
      DOM.valLatestStatus.textContent = `Status: ${latest.status || 'CONFIRMED'} (${latest.detection_id})`;
    }
  }

  // Render Table Rows
  if (DOM.detectionTableBody && Array.isArray(detections)) {
    if (detections.length === 0) {
      DOM.detectionTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">No ground targets detected yet in Sector 7B.</td>
        </tr>
      `;
      return;
    }

    const rowsHtml = detections.map(d => {
      const isPerson = ['person', 'survivor', 'casualty', 'human'].includes((d.class_name || '').toLowerCase());
      const classBadgeClass = isPerson ? 'badge-rose' : 'badge-amber';
      const classIcon = isPerson ? 'fa-person-falling-burst' : 'fa-triangle-exclamation';
      const confPercent = (Number(d.confidence || 0) * 100).toFixed(1);

      const bboxStr = d.bbox
        ? `[${Math.round(d.bbox.x1)}, ${Math.round(d.bbox.y1)}, ${Math.round(d.bbox.x2)}, ${Math.round(d.bbox.y2)}]`
        : 'N/A';

      // Rule 11: Do not invent accurate GPS without real sensor georeferencing
      const coordsStr = (d.latitude && d.longitude)
        ? `${Number(d.latitude).toFixed(4)}° N, ${Math.abs(Number(d.longitude)).toFixed(4)}° W`
        : '<span style="color: var(--text-muted); font-size: 0.72rem; font-style: italic;">GPS Unavailable</span>';

      const simTag = d.is_simulated
        ? `<span class="badge badge-amber" style="font-size: 0.65rem;">SIM</span>`
        : `<span class="badge badge-emerald" style="font-size: 0.65rem;">LIVE</span>`;

      const srcType = (d.source_type || 'simulation').toUpperCase();
      let srcBadge = 'badge-amber';
      if (srcType === 'IMAGE') srcBadge = 'badge-cyan';
      else if (srcType === 'VIDEO') srcBadge = 'badge-cyan';
      else if (srcType === 'WEBCAM' || srcType === 'RTSP') srcBadge = 'badge-emerald';

      return `
        <tr>
          <td><b style="color: var(--accent-cyan);">${d.detection_id}</b> ${simTag}</td>
          <td>
            <span class="badge ${classBadgeClass}">
              <i class="fa-solid ${classIcon}"></i> ${(d.class_name || '').toUpperCase()}
            </span>
          </td>
          <td><b style="color: var(--accent-emerald);">${confPercent}%</b></td>
          <td><code style="color: var(--text-muted); font-size: 0.72rem;">${bboxStr}</code></td>
          <td><b>${coordsStr}</b></td>
          <td><span class="badge ${srcBadge}" style="font-size: 0.68rem;">${srcType}</span></td>
          <td><span class="badge badge-cyan">${d.status || 'CONFIRMED'}</span></td>
          <td style="color: var(--text-muted); font-size: 0.72rem;">${d.source_model || 'YOLOv8'}</td>
        </tr>
      `;
    }).join('');

    DOM.detectionTableBody.innerHTML = rowsHtml;
  }
}

/**
 * Maps video stream ingestion telemetry and source state to the UI panel.
 * @param {Object} data - VideoStatusResponse model from /api/v1/video/status
 */
function renderVideoUI(data) {
  if (!data) return;
  const isStreaming = data.status === 'STREAMING';
  const isError = data.status === 'ERROR';

  if (DOM.videoStatusDot) {
    DOM.videoStatusDot.className = isError ? 'status-dot offline' : (isStreaming ? 'status-dot online' : 'status-dot amber');
  }
  if (DOM.videoStatusText) {
    DOM.videoStatusText.textContent = isError ? 'FEED ERROR' : (isStreaming ? 'STREAMING ACTIVE' : 'STANDBY (IDLE)');
    DOM.videoStatusText.style.color = isError ? 'var(--accent-rose)' : (isStreaming ? 'var(--accent-emerald)' : 'var(--accent-amber)');
  }
  if (DOM.textVideoToggle) {
    DOM.textVideoToggle.textContent = isStreaming ? 'Stop Feed' : 'Start Feed';
  }
  if (DOM.iconVideoToggle) {
    DOM.iconVideoToggle.className = isStreaming ? 'fa-solid fa-stop' : 'fa-solid fa-play';
  }
  if (DOM.valVideoFps) DOM.valVideoFps.textContent = Number(data.fps || 0).toFixed(1);
  if (DOM.valVideoFrames) DOM.valVideoFrames.textContent = data.frame_count || 0;
  if (DOM.valVideoDetections) DOM.valVideoDetections.textContent = data.detections_count || 0;
  if (DOM.valActiveSource) DOM.valActiveSource.textContent = (data.source_type || 'simulation').toUpperCase();

  if (DOM.badgeVideoSourceType) {
    const srcUpper = (data.source_type || 'simulation').toUpperCase();
    DOM.badgeVideoSourceType.textContent = `${srcUpper} FEED`;
    DOM.badgeVideoSourceType.className = `badge ${data.is_simulation ? 'badge-amber' : 'badge-emerald'}`;
  }

  // Active source button styling
  const currentSrc = data.source_type || 'simulation';
  if (DOM.btnSourceSim) DOM.btnSourceSim.classList.toggle('active', currentSrc === 'simulation');
  if (DOM.btnSourceVideo) DOM.btnSourceVideo.classList.toggle('active', currentSrc === 'video');
  if (DOM.btnSourceWebcam) DOM.btnSourceWebcam.classList.toggle('active', currentSrc === 'webcam');

  // Error alert banner display
  if (DOM.videoErrorAlert) {
    if (data.last_error) {
      DOM.videoErrorAlert.style.display = 'flex';
      if (DOM.videoErrorMsg) DOM.videoErrorMsg.textContent = data.last_error;
    } else {
      DOM.videoErrorAlert.style.display = 'none';
    }
  }
}

/**
 * Switches the video stream input source via POST /api/v1/video/source.
 */
async function switchVideoSource(sourceType, sourcePath = null) {
  try {
    const res = await fetch(ENDPOINTS.VIDEO_SOURCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_type: sourceType, source_path: sourcePath })
    });
    if (res.ok) {
      const data = await res.json();
      renderVideoUI(data);
    } else {
      const err = await res.json();
      renderVideoUI({ status: 'ERROR', source_type: sourceType, last_error: err.detail || 'Source error' });
    }
  } catch (err) {
    console.error('Failed to switch video source:', err);
  }
}

/**
 * Toggles video stream ingestion worker thread.
 */
async function toggleVideoStream() {
  try {
    const statusRes = await fetch(ENDPOINTS.VIDEO_STATUS);
    if (!statusRes.ok) return;
    const current = await statusRes.json();
    const endpoint = current.status === 'STREAMING' ? ENDPOINTS.VIDEO_STOP : ENDPOINTS.VIDEO_START;
    const res = await fetch(endpoint, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      renderVideoUI(updated);
    }
  } catch (err) {
    console.error('Failed to toggle video stream:', err);
  }
}

/**
 * Triggers one-shot frame processing from active source via POST /api/v1/video/process-frame.
 */
async function processSingleFrame() {
  try {
    const res = await fetch(ENDPOINTS.VIDEO_PROCESS_FRAME, { method: 'POST' });
    if (res.ok) {
      await fetchTelemetryData();
    }
  } catch (err) {
    console.error('Failed to process single frame:', err);
  }
}

/**
 * Handles UI connection state (Online vs Offline error banner).
 * @param {boolean} isConnected - Whether backend responded successfully
 * @param {string} errorDetails - Error message for troubleshooting
 */
function setConnectionState(isConnected, errorDetails = '') {
  if (isConnected) {
    // Online state
    if (DOM.apiStatusDot) {
      DOM.apiStatusDot.className = 'status-dot online';
    }
    if (DOM.apiStatusText) {
      DOM.apiStatusText.textContent = 'API ONLINE (SIM)';
      DOM.apiStatusText.style.color = 'var(--accent-emerald)';
    }
    if (DOM.errorBanner) {
      DOM.errorBanner.style.display = 'none';
    }
  } else {
    // Offline state
    if (DOM.apiStatusDot) {
      DOM.apiStatusDot.className = 'status-dot offline';
    }
    if (DOM.apiStatusText) {
      DOM.apiStatusText.textContent = 'BACKEND OFFLINE';
      DOM.apiStatusText.style.color = 'var(--accent-rose)';
    }
    if (DOM.errorBanner) {
      DOM.errorBanner.style.display = 'flex';
      if (DOM.errorTitle) DOM.errorTitle.textContent = 'FastAPI Backend Unreachable';
      if (DOM.errorMessage) {
        DOM.errorMessage.textContent = `Could not connect to ${API_BASE_URL}. Ensure the backend server is running via: uvicorn app.main:app --reload --port 8000 (${errorDetails})`;
      }
    }
  }
}

// ============================================================================
// 5. INITIALIZATION & EVENT LISTENERS
// ============================================================================
function initDashboard() {
  // Start live UTC clock
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // Initialize Tactical GPS Mission Map (Leaflet.js)
  mapManager.init();

  // Map Controls Event Listeners
  if (DOM.btnCenterDrone) {
    DOM.btnCenterDrone.addEventListener('click', () => {
      mapManager.centerOnDrone();
    });
  }

  if (DOM.btnToggleAutoPan) {
    DOM.btnToggleAutoPan.addEventListener('click', () => {
      mapManager.toggleAutoPan();
    });
  }

  if (DOM.btnToggleTrail) {
    DOM.btnToggleTrail.addEventListener('click', () => {
      mapManager.toggleTrail();
    });
  }

  // Manual Refresh Button Event
  if (DOM.btnRefresh) {
    DOM.btnRefresh.addEventListener('click', () => {
      fetchTelemetryData();
    });
  }

  // Error Banner Retry Button Event
  if (DOM.btnRetryConnection) {
    DOM.btnRetryConnection.addEventListener('click', () => {
      fetchTelemetryData();
    });
  }

  // Clear Detections Button Event
  if (DOM.btnClearDetections) {
    DOM.btnClearDetections.addEventListener('click', async () => {
      if (!confirm('Clear all recorded target detections?')) return;
      try {
        const res = await fetch(ENDPOINTS.DETECTIONS_LIST, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          await fetchTelemetryData();
        }
      } catch (err) {
        console.error('Failed to clear detections:', err);
      }
    });
  }

  // Video Source Selection Buttons
  if (DOM.btnSourceSim) {
    DOM.btnSourceSim.addEventListener('click', () => switchVideoSource('simulation'));
  }
  if (DOM.btnSourceVideo) {
    DOM.btnSourceVideo.addEventListener('click', () => switchVideoSource('video', 'ai/sample_data/sample_video.mp4'));
  }
  if (DOM.btnSourceWebcam) {
    DOM.btnSourceWebcam.addEventListener('click', () => switchVideoSource('webcam', '0'));
  }

  // Toggle Video Streaming Worker
  if (DOM.btnToggleVideoStream) {
    DOM.btnToggleVideoStream.addEventListener('click', toggleVideoStream);
  }
  if (DOM.btnProcessSingleFrame) {
    DOM.btnProcessSingleFrame.addEventListener('click', processSingleFrame);
  }

  // Initial immediate fetch
  fetchTelemetryData();

  // Start continuous 1-second interval polling
  if (pollingTimerId) clearInterval(pollingTimerId);
  pollingTimerId = setInterval(fetchTelemetryData, POLLING_INTERVAL_MS);
}

// Kick off when DOM is fully parsed
document.addEventListener('DOMContentLoaded', initDashboard);
