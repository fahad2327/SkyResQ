/**
 * SkyResQ: AI Rescue Drone Monitoring Dashboard
 * Frontend Prototype & Simulation Engine
 * 
 * NOTE: This is a frontend prototype with mock and simulated data.
 * No physical drone, live camera, or real YOLO inference server is connected.
 */

// ============================================================================
// Phase 2 - Step 1: Centralized Simulation State
// ============================================================================
const simulationState = {
  // Required Core Attributes
  simulationEnabled: true,
  batteryPercentage: 84.0,
  altitude: 48.2, // meters AGL
  groundSpeed: 14.2, // m/s
  latitude: 34.2512,
  longitude: -118.1524,
  heading: 284, // degrees (0-360)
  gpsSatellites: 18,
  flightStatus: 'IN FLIGHT', // 'IN FLIGHT' | 'HOVERING' | 'RTL' | 'SIM PAUSED'
  missionStatus: 'SEARCHING SECTOR 7B',
  cameraMode: 'rgb', // 'rgb' | 'thermal' | 'nvg'
  detectedPersonCount: 3,

  // Supporting Telemetry & Avionics Attributes
  batteryVoltage: 22.8,
  climbRate: 0.2, // m/s
  pitch: -28.4,
  roll: 1.2,
  rfLink: 98.6,
  latency: 22,
  missionProgress: 68,
  flightDurationSeconds: 1458,
  isArmed: true,
  flightMode: 'AUTO-SEARCH GRID',

  // Phase 2 - Step 2: Flight Control & Navigation Anchors
  homeLatitude: 34.2500,
  homeLongitude: -118.1500,
  targetAltitude: 48.0,
  advisoryType: 'nominal',
  advisoryMsg: 'System nominal. Autopilot actively executing lawnmower grid search at 48m AGL. All simulated flight controls ready.',

  // Phase 2 - Step 3: Tactical Search Grid & Autonomous Sweep State
  gridSize: 6, // 4 | 6 | 8
  searchPattern: 'lawnmower', // 'lawnmower' | 'spiral' | 'sector'
  searchSpeed: 'normal', // 'slow' | 'normal' | 'fast'
  searchExecutionState: 'IDLE', // 'IDLE' | 'SEARCHING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
  activeCellIndex: -1,
  activeCellId: 'NONE',
  searchedCellsCount: 0,
  totalCellsCount: 36,
  targetsFoundInGrid: 0,
  activeWaypointIndex: 0,
  targetLatitude: 34.2500,
  targetLongitude: -118.1580,
  targetName: 'WP-01',
  distanceToTarget: 420.0,
  bearingToTarget: 270,
  navigationMode: 'AUTO_GRID', // 'AUTO_GRID' | 'TARGET_DISPATCH' | 'MANUAL_HOLD'
  customTarget: null,
  showSearchGrid: true,
  showBreadcrumbs: true,
  geofenceBreach: false,
  geofenceWarning: false,
  launchDistance: 380.0,
  geofenceClearance: 820.0,

  // Getters and Setters for Seamless Integration with Existing Subsystems
  get batteryPercent() { return this.batteryPercentage; },
  set batteryPercent(v) { this.batteryPercentage = v; },

  get speed() { return this.groundSpeed; },
  set speed(v) { this.groundSpeed = v; },

  get lat() { return this.latitude; },
  set lat(v) { this.latitude = v; },

  get lon() { return this.longitude; },
  set lon(v) { this.longitude = v; },

  get status() { return this.flightStatus; },
  set status(v) { this.flightStatus = v; }
};

// ============================================================================
// Phase 2 - Step 3: Search Grid Waypoints & Navigation Equations
// ============================================================================
const SEARCH_GRID_WAYPOINTS = [
  { id: 'WP-01', name: 'Sector 7B - Entry Point', lat: 34.2500, lon: -118.1580, alt: 48, leg: 'Entry Transition', type: 'Ingress' },
  { id: 'WP-02', name: 'Sector 7B - North Sweep 1', lat: 34.2545, lon: -118.1580, alt: 48, leg: 'Northbound Leg 1', type: 'Sweep' },
  { id: 'WP-03', name: 'Sector 7B - Cross Turn 1', lat: 34.2545, lon: -118.1530, alt: 48, leg: 'East Cross Leg', type: 'Turn' },
  { id: 'WP-04', name: 'Sector 7B - South Sweep 1', lat: 34.2485, lon: -118.1530, alt: 48, leg: 'Southbound Leg 2', type: 'Sweep' },
  { id: 'WP-05', name: 'Sector 7B - Cross Turn 2', lat: 34.2485, lon: -118.1480, alt: 48, leg: 'East Cross Leg', type: 'Turn' },
  { id: 'WP-06', name: 'Sector 7B - North Sweep 2', lat: 34.2550, lon: -118.1480, alt: 48, leg: 'Northbound Leg 3', type: 'Sweep' },
  { id: 'WP-07', name: 'Sector 7B - Ridge Pass', lat: 34.2530, lon: -118.1450, alt: 52, leg: 'Perimeter Ridge', type: 'Sweep' },
  { id: 'WP-08', name: 'Sector 7B - Lawnmower Exit', lat: 34.2490, lon: -118.1450, alt: 48, leg: 'Egress Orbit', type: 'Egress' }
];

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calcBearingDegrees(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ============================================================================
// Global State & Simulation Configuration
// ============================================================================
// Initial Simulated Application State
const STATE = {
  // Avionics & Telemetry
  telemetry: simulationState,

  // Rotor ESCs & Motors
  motors: [
    { id: 1, rpm: 5240, fill: 82 },
    { id: 2, rpm: 5280, fill: 83 },
    { id: 3, rpm: 5210, fill: 81 },
    { id: 4, rpm: 5260, fill: 82 }
  ],

  // Primary Camera Gimbal & Vision Pipeline
  camera: {
    visionMode: 'rgb',
    showBoundingBoxes: true,
    thermalBoost: false,
    confidenceThreshold: 0.50,
    showLabels: true,
    thermalSmoothing: true,
    selectedTargetId: 'TARGET-01',
    lockedTargetId: null
  },

  // Settings & Controls
  settings: {
    simSpeed: 1, // 1x, 2x, 5x
    audioSim: true,
    geofenceRadius: 1200, // meters
    get isRunning() { return simulationState.simulationEnabled; },
    set isRunning(v) { simulationState.simulationEnabled = v; }
  },

  // Detected Human Targets (Simulated)
  detections: [
    {
      id: 'TARGET-01',
      lat: 34.2538,
      lon: -118.1502,
      confidence: 0.964,
      triage: 'critical',
      label: 'Person #1 (SOS Signal)',
      thermalTemp: '37.1°C',
      timestamp: '21:18:42',
      status: 'Active (Urgent)',
      canvasX: 260,
      canvasY: 180
    },
    {
      id: 'TARGET-02',
      lat: 34.2562,
      lon: -118.1478,
      confidence: 0.912,
      triage: 'amber',
      label: 'Person #2 (Resting)',
      thermalTemp: '36.8°C',
      timestamp: '21:22:15',
      status: 'Monitored',
      canvasX: 450,
      canvasY: 240
    },
    {
      id: 'TARGET-03',
      lat: 34.2489,
      lon: -118.1555,
      confidence: 0.885,
      triage: 'emerald',
      label: 'Person #3 (Moving)',
      thermalTemp: '36.6°C',
      timestamp: '21:27:04',
      status: 'Ground Team En Route',
      canvasX: 140,
      canvasY: 310
    }
  ],

  // Alert Log
  alerts: [
    {
      id: 1,
      type: 'critical',
      title: 'TARGET DETECTED // SOS CONFIRMED',
      msg: 'Thermal body signature found at Sector 7B (34.2538°N, -118.1502°W). Confidence: 96.4%.',
      time: '21:18:42'
    },
    {
      id: 2,
      type: 'warning',
      title: 'LOCAL WIND ADVISORY',
      msg: 'Simulated crosswind gust detected: 4.8 m/s NW. Stabilizer active.',
      time: '21:20:00'
    },
    {
      id: 3,
      type: 'info',
      title: 'WAYPOINT WP-04 REACHED',
      msg: 'Autonomous lawnmower search grid leg 4 complete. Turning heading to 284°.',
      time: '21:23:30'
    },
    {
      id: 4,
      type: 'critical',
      title: 'NEW PERSON DETECTED // TARGET-02',
      msg: 'Computer vision identified human form near rocky ledge. Confidence: 91.2%.',
      time: '21:25:10'
    }
  ],

  // Active Navigation View
  activeView: 'dashboard'
};

// ============================================================================
// DOM References
// ============================================================================
const DOM = {
  // Navigation
  navLinks: document.querySelectorAll('.sidebar-nav .nav-link'),
  views: document.querySelectorAll('.view-container'),
  sidebarBadgeCount: document.getElementById('sidebarBadgeCount'),

  // Header & Simulation Mode Indicator
  simModeBadge: document.getElementById('simModeBadge'),
  simModeText: document.getElementById('simModeText'),
  simPulseDot: document.getElementById('simPulseDot'),
  btnToggleSimulation: document.getElementById('btnToggleSimulation'),
  simToggleIcon: document.getElementById('simToggleIcon'),
  simToggleText: document.getElementById('simToggleText'),
  topLinkQuality: document.getElementById('topLinkQuality'),
  topLatency: document.getElementById('topLatency'),
  liveClockUtc: document.getElementById('liveClockUtc'),
  flightDuration: document.getElementById('flightDuration'),
  btnTriggerDetection: document.getElementById('btnTriggerDetection'),
  btnRTL: document.getElementById('btnRTL'),
  flightModeBadge: document.getElementById('flightModeBadge'),
  systemStatusDot: document.getElementById('systemStatusDot'),

  // Telemetry Cards
  cardDroneStatus: document.getElementById('cardDroneStatus'),
  cardFlightState: document.getElementById('cardFlightState'),
  cardSimActiveStatus: document.getElementById('cardSimActiveStatus'),
  cardFlightStatusBar: document.getElementById('cardFlightStatusBar'),
  cardBatteryPercent: document.getElementById('cardBatteryPercent'),
  cardBatteryVolts: document.getElementById('cardBatteryVolts'),
  cardBatteryBar: document.getElementById('cardBatteryBar'),
  cardBatteryRemaining: document.getElementById('cardBatteryRemaining'),
  cardGpsLat: document.getElementById('cardGpsLat'),
  cardGpsLon: document.getElementById('cardGpsLon'),
  cardGpsSats: document.getElementById('cardGpsSats'),
  cardGpsBar: document.getElementById('cardGpsBar'),
  cardAltitude: document.getElementById('cardAltitude'),
  cardAltitudeBar: document.getElementById('cardAltitudeBar'),
  cardAltitudeMsl: document.getElementById('cardAltitudeMsl'),
  cardClimbRate: document.getElementById('cardClimbRate'),
  cardSpeed: document.getElementById('cardSpeed'),
  cardSpeedKmh: document.getElementById('cardSpeedKmh'),
  cardSpeedBar: document.getElementById('cardSpeedBar'),
  cardHeadingVal: document.getElementById('cardHeadingVal'),
  cardPersonCount: document.getElementById('cardPersonCount'),
  cardPersonAlert: document.getElementById('cardPersonAlert'),
  cardPersonSub: document.getElementById('cardPersonSub'),
  cardPersonBar: document.getElementById('cardPersonBar'),
  cardAiConfidence: document.getElementById('cardAiConfidence'),
  cardAiConfidenceBar: document.getElementById('cardAiConfidenceBar'),
  cardCameraMode: document.getElementById('cardCameraMode'),
  cardMissionProgress: document.getElementById('cardMissionProgress'),
  cardMissionBar: document.getElementById('cardMissionBar'),
  cardMissionStatusText: document.getElementById('cardMissionStatusText'),
  cardGeofenceStatus: document.getElementById('cardGeofenceStatus'),

  // Phase 2 - Step 2: Interactive Drone Flight Control Deck
  droneControlDeck: document.getElementById('droneControlDeck'),
  btnControlArm: document.getElementById('btnControlArm'),
  textControlArm: document.getElementById('textControlArm'),
  descControlArm: document.getElementById('descControlArm'),
  badgeControlArm: document.getElementById('badgeControlArm'),
  iconControlArm: document.getElementById('iconControlArm'),
  btnControlTakeoff: document.getElementById('btnControlTakeoff'),
  btnControlHold: document.getElementById('btnControlHold'),
  btnControlLand: document.getElementById('btnControlLand'),
  btnControlRtl: document.getElementById('btnControlRtl'),
  controlStateBadge: document.getElementById('controlStateBadge'),
  controlStateDot: document.getElementById('controlStateDot'),
  controlFlightStateText: document.getElementById('controlFlightStateText'),
  controlSafetyAdvisory: document.getElementById('controlSafetyAdvisory'),
  advisoryIcon: document.getElementById('advisoryIcon'),
  advisoryLabel: document.getElementById('advisoryLabel'),
  advisoryMessage: document.getElementById('advisoryMessage'),

  // Camera Feeds
  cameraCanvas: document.getElementById('cameraCanvas'),
  theaterCanvas: document.getElementById('theaterCanvas'),
  modeBtns: document.querySelectorAll('.mode-btn'),
  hudPitch: document.getElementById('hudPitch'),
  hudRoll: document.getElementById('hudRoll'),
  hudBearing: document.getElementById('hudBearing'),
  hudGps: document.getElementById('hudGps'),
  hudAlt: document.getElementById('hudAlt'),
  hudZoom: document.getElementById('hudZoom'),
  feedFps: document.getElementById('feedFps'),
  btnToggleBoxes: document.getElementById('btnToggleBoxes'),
  btnToggleThermalNoise: document.getElementById('btnToggleThermalNoise'),
  btnSnapshot: document.getElementById('btnSnapshot'),

  // AI Detection Panel
  detectionList: document.getElementById('detectionList'),
  badgeHighRiskCount: document.getElementById('badgeHighRiskCount'),

  // Alerts
  alertStream: document.getElementById('alertStream'),
  btnClearAlerts: document.getElementById('btnClearAlerts'),

  // Telemetry View Elements
  horizonLine: document.getElementById('horizonLine'),
  telemetryPitch: document.getElementById('telemetryPitch'),
  telemetryRoll: document.getElementById('telemetryRoll'),
  telemetryYaw: document.getElementById('telemetryYaw'),
  motorFills: [
    document.getElementById('motorFill1'),
    document.getElementById('motorFill2'),
    document.getElementById('motorFill3'),
    document.getElementById('motorFill4')
  ],
  motorRpms: [
    document.getElementById('motorRpm1'),
    document.getElementById('motorRpm2'),
    document.getElementById('motorRpm3'),
    document.getElementById('motorRpm4')
  ],

  // History & Reports
  historyTableBody: document.getElementById('historyTableBody'),
  reportFlightTime: document.getElementById('reportFlightTime'),
  reportVictimCount: document.getElementById('reportVictimCount'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnGenerateReport: document.getElementById('btnGenerateReport'),
  btnDownloadFlightPath: document.getElementById('btnDownloadFlightPath'),

  // Settings
  checkSimulationEnabled: document.getElementById('checkSimulationEnabled'),
  simSpeedSelect: document.getElementById('simSpeedSelect'),
  checkAudioSim: document.getElementById('checkAudioSim'),
  geofenceRadiusSlider: document.getElementById('geofenceRadiusSlider'),
  geofenceRadiusVal: document.getElementById('geofenceRadiusVal'),
  btnResetSimulation: document.getElementById('btnResetSimulation'),
  confThresholdSlider: document.getElementById('confThresholdSlider'),
  confThresholdVal: document.getElementById('confThresholdVal'),
  checkShowLabels: document.getElementById('checkShowLabels'),
  checkHeatSmoothing: document.getElementById('checkHeatSmoothing'),

  // Phase 2 - Step 3: Interactive Tactical Mission Map & Search Grid
  dashActiveWaypointBadge: document.getElementById('dashActiveWaypointBadge'),
  dashWpText: document.getElementById('dashWpText'),
  btnToggleDashGrid: document.getElementById('btnToggleDashGrid'),
  btnToggleDashTrail: document.getElementById('btnToggleDashTrail'),
  btnToggleGridOverlay: document.getElementById('btnToggleGridOverlay'),
  btnClearBreadcrumbs: document.getElementById('btnClearBreadcrumbs'),
  btnCenterMapDrone: document.getElementById('btnCenterMapDrone'),
  mapFloatingHud: document.getElementById('mapFloatingHud'),
  mapHudMode: document.getElementById('mapHudMode'),
  mapHudTarget: document.getElementById('mapHudTarget'),
  mapHudDist: document.getElementById('mapHudDist'),
  dispatchControlBox: document.getElementById('dispatchControlBox'),
  dispatchStatusText: document.getElementById('dispatchStatusText'),
  btnResumeGrid: document.getElementById('btnResumeGrid'),
  geofenceRadarCard: document.getElementById('geofenceRadarCard'),
  geofenceStatusPill: document.getElementById('geofenceStatusPill'),
  geofenceLaunchDist: document.getElementById('geofenceLaunchDist'),
  geofenceLimitVal: document.getElementById('geofenceLimitVal'),
  geofenceClearanceVal: document.getElementById('geofenceClearanceVal'),

  // Step 3 Autonomous Search Grid Controls & Selectors
  selectGridSize: document.getElementById('selectGridSize'),
  selectSearchPattern: document.getElementById('selectSearchPattern'),
  selectSearchSpeed: document.getElementById('selectSearchSpeed'),
  btnStartSearch: document.getElementById('btnStartSearch'),
  btnPauseSearch: document.getElementById('btnPauseSearch'),
  btnResumeSearch: document.getElementById('btnResumeSearch'),
  btnStopSearch: document.getElementById('btnStopSearch'),
  btnResetGrid: document.getElementById('btnResetGrid'),
  searchProgressCard: document.getElementById('searchProgressCard'),
  searchExecutionBadge: document.getElementById('searchExecutionBadge'),
  searchActiveCellLabel: document.getElementById('searchActiveCellLabel'),
  searchActiveCellStatePill: document.getElementById('searchActiveCellStatePill'),
  searchActiveCellCoords: document.getElementById('searchActiveCellCoords'),
  searchCellsDoneVal: document.getElementById('searchCellsDoneVal'),
  searchPercentVal: document.getElementById('searchPercentVal'),
  searchCellsRemainingVal: document.getElementById('searchCellsRemainingVal'),
  searchEtaVal: document.getElementById('searchEtaVal'),
  searchProgressLabel: document.getElementById('searchProgressLabel'),
  searchProgressBar: document.getElementById('searchProgressBar'),
  searchTargetsFoundCount: document.getElementById('searchTargetsFoundCount'),

  // Phase 2 - Step 4: AI Target Recognition & Thermal Studio
  theaterAnalyticsText: document.getElementById('theaterAnalyticsText'),
  theaterTrackingText: document.getElementById('theaterTrackingText'),
  theaterTargetCount: document.getElementById('theaterTargetCount'),
  gimbalLockHud: document.getElementById('gimbalLockHud'),
  gimbalLockText: document.getElementById('gimbalLockText'),
  targetInspectorCard: document.getElementById('targetInspectorCard'),
  inspectorTargetId: document.getElementById('inspectorTargetId'),
  inspectorTriagePill: document.getElementById('inspectorTriagePill'),
  targetQuickSelector: document.getElementById('targetQuickSelector'),
  inspectorThermalVal: document.getElementById('inspectorThermalVal'),
  inspectorConfVal: document.getElementById('inspectorConfVal'),
  inspectorCoordsVal: document.getElementById('inspectorCoordsVal'),
  inspectorDistVal: document.getElementById('inspectorDistVal'),
  inspectorStatusVal: document.getElementById('inspectorStatusVal'),
  inspectorTimeVal: document.getElementById('inspectorTimeVal'),
  btnLockTarget: document.getElementById('btnLockTarget'),
  iconLockTarget: document.getElementById('iconLockTarget'),
  textLockTarget: document.getElementById('textLockTarget'),
  btnVerifyTriage: document.getElementById('btnVerifyTriage'),
  iconVerifyTriage: document.getElementById('iconVerifyTriage'),
  textVerifyTriage: document.getElementById('textVerifyTriage'),
  btnDispatchToDetectedTarget: document.getElementById('btnDispatchToDetectedTarget')
};

// ============================================================================
// Audio Synthesizer (Simulated Tactical Beep)
// ============================================================================
class AudioSynthesizer {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playBeep(freq = 880, duration = 0.15, type = 'sine') {
    if (!STATE.settings.audioSim) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playTargetLock() {
    this.playBeep(920, 0.1, 'sine');
    setTimeout(() => this.playBeep(1200, 0.18, 'triangle'), 110);
  }
}

const audioSynth = new AudioSynthesizer();

// ============================================================================
// Simulated Canvas Camera-Feed Engine
// ============================================================================
class CameraFeedRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationFrameId = null;
    this.terrainOffset = 0;
    this.frameCounter = 0;
    this.fps = 30;
    this.lastTimestamp = performance.now();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Click canvas to select detected target
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const threshold = STATE.camera.confidenceThreshold || 0.5;
      const visibleTargets = STATE.detections.filter((t) => t.confidence >= threshold);

      const clicked = visibleTargets.find((t) => Math.hypot(t.canvasX - clickX, t.canvasY - clickY) < 38);
      if (clicked && window.opsManager) {
        window.opsManager.selectTarget(clicked.id);
      }
    });
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 640;
    this.canvas.height = rect.height || 420;
  }

  start() {
    const loop = (timestamp) => {
      this.update(timestamp);
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  update(timestamp) {
    // Measure FPS
    this.frameCounter++;
    if (timestamp - this.lastTimestamp >= 1000) {
      this.fps = (this.frameCounter * 1000) / (timestamp - this.lastTimestamp);
      this.lastTimestamp = timestamp;
      this.frameCounter = 0;
      if (DOM.feedFps) {
        DOM.feedFps.textContent = this.fps.toFixed(1);
      }
    }

    // Scroll simulated terrain only when simulation is active
    if (simulationState.simulationEnabled) {
      const speed = (simulationState.groundSpeed * 0.15) * STATE.settings.simSpeed;
      this.terrainOffset = (this.terrainOffset + speed) % 800;

      // Slowly drift targets slightly for realistic motion
      STATE.detections.forEach((target, i) => {
        target.canvasX += Math.sin(timestamp * 0.002 + i) * 0.25;
        target.canvasY += Math.cos(timestamp * 0.002 + i) * 0.2;
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const mode = STATE.camera.visionMode;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Aerial Terrain Simulation
    this.drawSimulatedTerrain(ctx, w, h, mode);

    // 2. Draw Simulated Human Targets
    this.drawSimulatedHumans(ctx, mode);

    // 3. Draw AI YOLO Bounding Boxes
    if (STATE.camera.showBoundingBoxes) {
      this.drawBoundingBoxes(ctx, mode);
    }

    // 4. Draw Gimbal Crosshairs & Tactical Pitch Ladder
    this.drawPitchLadder(ctx, w, h, mode);

    // 5. Draw Locked Gimbal Tracking Line & HUD Overlays
    if (STATE.camera.lockedTargetId) {
      this.drawGimbalLockTracker(ctx, w, h);
    }
  }

  drawSimulatedTerrain(ctx, w, h, mode) {
    // Background gradient based on vision mode
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (mode === 'thermal') {
      // Ironbow FLIR Thermal palette (dark purple/blue to dark violet)
      grad.addColorStop(0, '#0a0628');
      grad.addColorStop(0.5, '#16093b');
      grad.addColorStop(1, '#05021a');
    } else if (mode === 'nvg') {
      // Phosphor Night Vision Green
      grad.addColorStop(0, '#021a08');
      grad.addColorStop(1, '#010c04');
    } else {
      // RGB Daylight Aerial Terrain (Dark forest/mountain tones)
      grad.addColorStop(0, '#101a14');
      grad.addColorStop(0.5, '#15241b');
      grad.addColorStop(1, '#0c1711');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw topographic elevation contour curves
    ctx.lineWidth = 1.5;
    const numCurves = 7;
    for (let i = 0; i < numCurves; i++) {
      ctx.beginPath();
      const baseY = ((i * 70 + this.terrainOffset) % (h + 100)) - 50;

      if (mode === 'thermal') {
        ctx.strokeStyle = `rgba(80, 30, 160, 0.25)`;
      } else if (mode === 'nvg') {
        ctx.strokeStyle = `rgba(34, 197, 94, 0.2)`;
      } else {
        ctx.strokeStyle = `rgba(52, 211, 153, 0.15)`;
      }

      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 40) {
        const y = baseY + Math.sin((x + this.terrainOffset) * 0.015 + i) * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw simulated river / mountain road ravine
    ctx.beginPath();
    ctx.lineWidth = 6;
    if (mode === 'thermal') {
      ctx.strokeStyle = 'rgba(20, 10, 80, 0.6)'; // cold thermal water
    } else if (mode === 'nvg') {
      ctx.strokeStyle = 'rgba(10, 60, 20, 0.6)';
    } else {
      ctx.strokeStyle = 'rgba(30, 60, 50, 0.5)';
    }
    ctx.moveTo(w * 0.1, 0);
    ctx.bezierCurveTo(w * 0.3, h * 0.4, w * 0.6, h * 0.6, w * 0.9, h);
    ctx.stroke();

    // Noise grain overlay for NVG or Thermal Boost
    if (mode === 'nvg' || STATE.camera.thermalBoost) {
      ctx.fillStyle = mode === 'nvg' ? 'rgba(74, 222, 128, 0.04)' : 'rgba(251, 191, 36, 0.03)';
      for (let n = 0; n < 200; n++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.fillRect(rx, ry, 2, 2);
      }
    }
  }

  drawSimulatedHumans(ctx, mode) {
    const threshold = STATE.camera.confidenceThreshold || 0.5;
    const visibleDetections = STATE.detections.filter((t) => t.confidence >= threshold);

    visibleDetections.forEach((target) => {
      const x = target.canvasX;
      const y = target.canvasY;

      if (mode === 'thermal') {
        if (STATE.camera.thermalSmoothing) {
          // Smooth FLIR Radiometric Gradient
          const heatGrad = ctx.createRadialGradient(x, y, 2, x, y, 20);
          heatGrad.addColorStop(0, '#ffffff'); // White hot core (37.2°C)
          heatGrad.addColorStop(0.25, '#ffea00'); // Hot yellow
          heatGrad.addColorStop(0.65, '#ff3b00'); // Red/Orange edge
          heatGrad.addColorStop(1, 'rgba(160, 0, 80, 0)');

          ctx.fillStyle = heatGrad;
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Stepped Raw Sensor Heatmap (Raw FLIR pixelation)
          ctx.fillStyle = 'rgba(255, 59, 0, 0.35)';
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 234, 0, 0.6)';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Victim silhouette
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 5, 3.5, 0, Math.PI * 2); // head
        ctx.fillRect(x - 3, y - 1, 6, 8); // torso
        ctx.fill();
      } else if (mode === 'nvg') {
        // Bright phosphor glow
        ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y - 5, 3.5, 0, Math.PI * 2);
        ctx.fillRect(x - 3, y - 1, 6, 8);
        ctx.fill();
      } else {
        // RGB Daylight visual silhouette
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x, y - 5, 3.5, 0, Math.PI * 2);
        ctx.fillRect(x - 3, y - 1, 6, 8);
        ctx.fill();
      }
    });
  }

  drawBoundingBoxes(ctx, mode) {
    const threshold = STATE.camera.confidenceThreshold || 0.5;
    const visibleDetections = STATE.detections.filter((t) => t.confidence >= threshold);

    visibleDetections.forEach((target) => {
      const bx = target.canvasX - 24;
      const by = target.canvasY - 26;
      const bw = 48;
      const bh = 52;

      const isSelected = target.id === STATE.camera.selectedTargetId;
      const isLocked = target.id === STATE.camera.lockedTargetId;

      // Color scheme based on triage and selection
      let boxColor = '#00f0ff';
      if (isLocked) boxColor = '#f59e0b'; // Amber for locked target
      else if (target.triage === 'critical') boxColor = '#f43f5e';
      else if (target.triage === 'amber') boxColor = '#f59e0b';
      else if (target.triage === 'emerald') boxColor = '#10b981';

      // Draw bounding box border
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = isSelected ? 2.8 : 1.8;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner target brackets
      const cornerLen = isSelected ? 10 : 8;
      ctx.lineWidth = isSelected ? 3.2 : 2.5;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      // Label Tag
      if (STATE.camera.showLabels) {
        const confPercent = Math.round(target.confidence * 100);
        let labelText = `${target.id} | ${confPercent}% CONF`;
        if (isLocked) labelText = `[LOCK] ${target.id} | ${confPercent}%`;

        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(bx, by - 15, textWidth + 8, 15);

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by - 15, textWidth + 8, 15);

        ctx.fillStyle = boxColor;
        ctx.fillText(labelText, bx + 4, by - 4);
      }
    });
  }

  drawGimbalLockTracker(ctx, w, h) {
    const target = STATE.detections.find((t) => t.id === STATE.camera.lockedTargetId);
    if (!target) return;

    const cx = w / 2;
    const cy = h / 2;

    // Dotted dynamic tracking line from center reticle to target
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(cx, cy);
    ctx.lineTo(target.canvasX, target.canvasY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Distance HUD text along the line
    const midX = (cx + target.canvasX) / 2;
    const midY = (cy + target.canvasY) / 2;
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`TRACKING: ${target.id}`, midX + 6, midY - 6);

    // Rotating lock reticle around target
    ctx.beginPath();
    ctx.arc(target.canvasX, target.canvasY, 32, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawPitchLadder(ctx, w, h, mode) {
    const cx = w / 2;
    const cy = h / 2;
    const color = mode === 'nvg' ? 'rgba(74, 222, 128, 0.6)' : 'rgba(0, 240, 255, 0.5)';

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = color;

    // Pitch ladder horizontal markers (-10, 0, +10)
    [-30, -15, 15, 30].forEach((offset) => {
      const y = cy + offset;
      ctx.beginPath();
      ctx.moveTo(cx - 35, y);
      ctx.lineTo(cx - 15, y);
      ctx.moveTo(cx + 15, y);
      ctx.lineTo(cx + 35, y);
      ctx.stroke();

      ctx.fillText(`${Math.abs(offset)}°`, cx + 40, y + 3);
    });
  }
}

let primaryCamera = null;
let theaterCamera = null;

// ============================================================================
// Interactive Leaflet & OpenStreetMap Engine (Phase 2 - Step 3)
// ============================================================================
class MapManager {
  constructor() {
    this.dashboardMap = null;
    this.fullMap = null;
    this.droneMarkerDashboard = null;
    this.droneMarkerFull = null;
    this.flightPathPolyline = null;
    this.fullFlightPathPolyline = null;
    this.geofenceCircle = null;
    this.fullGeofenceCircle = null;
    this.victimMarkers = [];
    this.dashWaypointMarkers = [];
    this.fullWaypointMarkers = [];
    this.dashGridPolyline = null;
    this.fullGridPolyline = null;
    this.dashCustomMarker = null;
    this.fullCustomMarker = null;

    this.searchGridPath = SEARCH_GRID_WAYPOINTS.map((w) => [w.lat, w.lon]);
    this.currentWaypointIndex = 0;
    this.flightBreadcrumbs = [];

    // Phase 2 - Step 3: Tactical Configurable Grid Matrix
    this.gridMatrixSize = 6;
    this.gridCells = [];
    this.gridCellLayers = [];
    this.traversalSequence = [];
  }

  init() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet library not loaded.');
      return;
    }

    const startPos = [STATE.telemetry.lat, STATE.telemetry.lon];

    // 1. Initialize Dashboard Map
    const dashContainer = document.getElementById('missionMapContainer');
    if (dashContainer && !this.dashboardMap) {
      this.dashboardMap = L.map('missionMapContainer', {
        center: startPos,
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // Dark styled tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        className: 'dark-tiles',
        maxZoom: 18
      }).addTo(this.dashboardMap);

      this.droneMarkerDashboard = this.createDroneMarker(startPos).addTo(this.dashboardMap);
      this.flightPathPolyline = L.polyline([startPos], {
        color: '#00f0ff',
        weight: 2.5,
        opacity: 0.8,
        dashArray: '4, 6'
      }).addTo(this.dashboardMap);

      this.geofenceCircle = L.circle(startPos, {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.06,
        weight: 1.5,
        radius: STATE.settings.geofenceRadius
      }).addTo(this.dashboardMap);

      // Add zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(this.dashboardMap);
    }

    // 2. Initialize Full Map (in Mission Map view)
    const fullContainer = document.getElementById('fullMapContainer');
    if (fullContainer && !this.fullMap) {
      this.fullMap = L.map('fullMapContainer', {
        center: startPos,
        zoom: 15,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        className: 'dark-tiles',
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors | SkyResQ Simulation'
      }).addTo(this.fullMap);

      this.droneMarkerFull = this.createDroneMarker(startPos).addTo(this.fullMap);

      this.fullFlightPathPolyline = L.polyline([startPos], {
        color: '#00f0ff',
        weight: 3.0,
        opacity: 0.85,
        dashArray: '4, 6'
      }).addTo(this.fullMap);

      // Mirror geofence
      this.fullGeofenceCircle = L.circle(startPos, {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
        weight: 2,
        radius: STATE.settings.geofenceRadius
      }).addTo(this.fullMap);
    }

    // 3. Render Search Grid Waypoint Path on both maps
    this.renderSearchGrid();

    // 4. Render Tactical Configurable Grid Matrix (Step 3)
    this.buildTacticalGrid(simulationState.gridSize || 6);

    // 5. Render initial victim markers
    this.renderVictimMarkers();

    // 6. Setup click-to-fly coordinate inspector
    this.enableMapClickNavigation();
  }

  createDroneMarker(latlng) {
    const droneIcon = L.icon({
      iconUrl: 'assets/drone-marker.svg',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -20]
    });

    const marker = L.marker(latlng, { icon: droneIcon });
    marker.bindPopup(`
      <div class="popup-title"><i class="fa-solid fa-helicopter"></i> SkyResQ DRONE 01</div>
      <div class="popup-item">STATUS: ${STATE.telemetry.status}</div>
      <div class="popup-item">ALT: ${STATE.telemetry.altitude.toFixed(1)}m AGL</div>
      <div class="popup-item">SPEED: ${STATE.telemetry.speed.toFixed(1)} m/s</div>
      <div class="popup-item">BATTERY: ${STATE.telemetry.batteryPercent.toFixed(0)}%</div>
    `);
    return marker;
  }

  renderSearchGrid() {
    const gridCoords = SEARCH_GRID_WAYPOINTS.map((w) => [w.lat, w.lon]);

    // Dashboard Grid Polyline
    if (this.dashboardMap && !this.dashGridPolyline) {
      this.dashGridPolyline = L.polyline(gridCoords, {
        color: '#00f0ff',
        weight: 1.8,
        opacity: 0.6,
        dashArray: '6, 8'
      }).addTo(this.dashboardMap);
    }

    // Full Map Grid Polyline
    if (this.fullMap && !this.fullGridPolyline) {
      this.fullGridPolyline = L.polyline(gridCoords, {
        color: '#00f0ff',
        weight: 2.2,
        opacity: 0.7,
        dashArray: '6, 8'
      }).addTo(this.fullMap);
    }

    // Waypoint Markers
    SEARCH_GRID_WAYPOINTS.forEach((wp, index) => {
      const isFirst = index === 0;
      const htmlClass = `waypoint-pin ${isFirst ? 'active' : 'pending'}`;
      const icon = L.divIcon({
        className: 'custom-wp-icon',
        html: `<div class="${htmlClass}" id="wpMarker_${wp.id}"><span>${wp.id.replace('WP-0', '').replace('WP-', '')}</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const popupHtml = `
        <div class="popup-title" style="color: var(--accent-cyan);">
          <i class="fa-solid fa-location-crosshairs"></i> ${wp.name}
        </div>
        <div class="popup-item"><b>LEG TYPE:</b> ${wp.type}</div>
        <div class="popup-item"><b>COORDINATES:</b> ${wp.lat.toFixed(4)}°N, ${wp.lon.toFixed(4)}°W</div>
        <button class="btn-popup-dispatch" onclick="window.simEngine.dispatchToTarget('${wp.id}', ${wp.lat}, ${wp.lon})">
          <i class="fa-solid fa-play"></i> Fly to ${wp.id} (Sim)
        </button>
      `;

      if (this.dashboardMap) {
        const mDash = L.marker([wp.lat, wp.lon], { icon }).addTo(this.dashboardMap).bindPopup(popupHtml);
        this.dashWaypointMarkers.push(mDash);
      }

      if (this.fullMap) {
        const mFull = L.marker([wp.lat, wp.lon], { icon }).addTo(this.fullMap).bindPopup(popupHtml);
        this.fullWaypointMarkers.push(mFull);
      }
    });
  }

  updateWaypointHighlights(activeIndex) {
    SEARCH_GRID_WAYPOINTS.forEach((wp, idx) => {
      let stateClass = 'pending';
      if (idx === activeIndex) stateClass = 'active';
      else if (idx < activeIndex) stateClass = 'completed';

      const html = `<div class="waypoint-pin ${stateClass}"><span>${wp.id.replace('WP-0', '').replace('WP-', '')}</span></div>`;
      const icon = L.divIcon({
        className: 'custom-wp-icon',
        html,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (this.dashWaypointMarkers[idx]) {
        this.dashWaypointMarkers[idx].setIcon(icon);
      }
      if (this.fullWaypointMarkers[idx]) {
        this.fullWaypointMarkers[idx].setIcon(icon);
      }
    });
  }

  // Phase 2 - Step 3: Tactical Configurable Grid Matrix Builder
  buildTacticalGrid(size = 6) {
    this.gridMatrixSize = size;
    simulationState.gridSize = size;

    // Clear previous cell layers from map
    if (this.gridCellLayers && this.gridCellLayers.length > 0) {
      this.gridCellLayers.forEach((layer) => {
        if (this.fullMap && this.fullMap.hasLayer(layer)) {
          this.fullMap.removeLayer(layer);
        }
      });
    }

    this.gridCells = [];
    this.gridCellLayers = [];

    // Sector 7B Tactical Bounds
    const latMin = 34.2460;
    const latMax = 34.2560;
    const lonMin = -118.1580;
    const lonMax = -118.1460;

    const dLat = (latMax - latMin) / size;
    const dLon = (lonMax - lonMin) / size;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const north = latMax - r * dLat;
        const south = north - dLat;
        const west = lonMin + c * dLon;
        const east = west + dLon;
        const centerLat = (north + south) / 2;
        const centerLon = (west + east) / 2;
        const cellId = `R${r + 1}-C${c + 1}`;
        const index = r * size + c;

        const cell = {
          id: cellId,
          row: r,
          col: c,
          index: index,
          bounds: [[south, west], [north, east]],
          center: [centerLat, centerLon],
          state: 'unsearched' // 'unsearched' | 'searching' | 'searched' | 'detected' | 'skipped'
        };

        this.gridCells.push(cell);

        if (this.fullMap) {
          const rect = L.rectangle(cell.bounds, this.getCellStyle('unsearched')).addTo(this.fullMap);
          rect.bindTooltip(`<b>${cell.id}</b> [UNSEARCHED]`, {
            permanent: false,
            direction: 'center',
            className: 'tactical-cell-tooltip'
          });

          rect.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.openCellPopup(cell, rect);
          });

          this.gridCellLayers.push(rect);
        }
      }
    }

    // Compute visit order based on selected pattern
    this.computeTraversalSequence(simulationState.searchPattern || 'lawnmower', size);

    simulationState.totalCellsCount = this.gridCells.length;
    simulationState.searchedCellsCount = 0;
    simulationState.activeCellIndex = -1;
    simulationState.activeCellId = 'NONE';
    simulationState.targetsFoundInGrid = 0;

    if (window.simEngine) {
      window.simEngine.updateSearchHUD();
    }
  }

  getCellStyle(state) {
    switch (state) {
      case 'searching':
        return { color: '#f59e0b', weight: 2.5, opacity: 1.0, fillColor: '#f59e0b', fillOpacity: 0.38 };
      case 'searched':
        return { color: '#10b981', weight: 1.5, opacity: 0.85, fillColor: '#10b981', fillOpacity: 0.22 };
      case 'detected':
        return { color: '#f43f5e', weight: 2.5, opacity: 1.0, fillColor: '#f43f5e', fillOpacity: 0.45 };
      case 'skipped':
        return { color: '#64748b', weight: 1.0, opacity: 0.4, fillColor: '#334155', fillOpacity: 0.15, dashArray: '4, 4' };
      case 'unsearched':
      default:
        return { color: '#38bdf8', weight: 1.0, opacity: 0.5, fillColor: '#0284c7', fillOpacity: 0.08, dashArray: null };
    }
  }

  updateCellVisual(index) {
    if (index < 0 || index >= this.gridCells.length) return;
    const cell = this.gridCells[index];
    const layer = this.gridCellLayers[index];
    if (layer) {
      layer.setStyle(this.getCellStyle(cell.state));
      layer.setTooltipContent(`<b>${cell.id}</b> [${cell.state.toUpperCase()}]`);
    }
  }

  computeTraversalSequence(pattern = 'lawnmower', size = 6) {
    const seq = [];
    if (pattern === 'spiral') {
      let top = 0, bottom = size - 1, left = 0, right = size - 1;
      while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) seq.push(top * size + c);
        top++;
        for (let r = top; r <= bottom; r++) seq.push(r * size + right);
        right--;
        if (top <= bottom) {
          for (let c = right; c >= left; c--) seq.push(bottom * size + c);
          bottom--;
        }
        if (left <= right) {
          for (let r = bottom; r >= top; r--) seq.push(r * size + left);
          left++;
        }
      }
    } else if (pattern === 'sector') {
      const midR = Math.ceil(size / 2);
      const midC = Math.ceil(size / 2);
      const quadrants = [
        { r0: 0, r1: midR, c0: 0, c1: midC },       // NW
        { r0: 0, r1: midR, c0: midC, c1: size },    // NE
        { r0: midR, r1: size, c0: 0, c1: midC },    // SW
        { r0: midR, r1: size, c0: midC, c1: size }  // SE
      ];
      quadrants.forEach((q) => {
        for (let r = q.r0; r < q.r1; r++) {
          const isEven = (r - q.r0) % 2 === 0;
          if (isEven) {
            for (let c = q.c0; c < q.c1; c++) seq.push(r * size + c);
          } else {
            for (let c = q.c1 - 1; c >= q.c0; c--) seq.push(r * size + c);
          }
        }
      });
    } else {
      // Default: Lawnmower (Boustrophedon)
      for (let r = 0; r < size; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c < size; c++) seq.push(r * size + c);
        } else {
          for (let c = size - 1; c >= 0; c--) seq.push(r * size + c);
        }
      }
    }
    this.traversalSequence = seq;
    return seq;
  }

  openCellPopup(cell, layer) {
    const popupHtml = `
      <div class="popup-title" style="color: var(--accent-cyan);">
        <i class="fa-solid fa-table-cells"></i> CELL ${cell.id} (GRID INSPECT)
      </div>
      <div class="popup-item"><b>POSITION:</b> Row ${cell.row + 1}, Col ${cell.col + 1}</div>
      <div class="popup-item"><b>STATUS:</b> <span class="cell-status-tag ${cell.state}">${cell.state.toUpperCase()}</span></div>
      <div class="popup-item"><b>CENTER:</b> ${cell.center[0].toFixed(4)}°N, ${cell.center[1].toFixed(4)}°W</div>
      <div style="display: flex; gap: 6px; margin-top: 8px;">
        <button class="btn-popup-dispatch" style="flex:1;" onclick="window.mapManager.toggleCellSkip(${cell.index}); window.mapManager.fullMap.closePopup();">
          <i class="fa-solid fa-ban"></i> ${cell.state === 'skipped' ? 'Include Cell' : 'Skip Cell'}
        </button>
        <button class="btn-popup-dispatch" style="flex:1;" onclick="window.simEngine.dispatchToTarget('CELL ${cell.id}', ${cell.center[0]}, ${cell.center[1]}); window.mapManager.fullMap.closePopup();">
          <i class="fa-solid fa-location-arrow"></i> Fly Here
        </button>
      </div>
    `;
    layer.bindPopup(popupHtml).openPopup();
  }

  toggleCellSkip(index) {
    if (index < 0 || index >= this.gridCells.length) return;
    const cell = this.gridCells[index];
    if (cell.state === 'searching') return; // cannot skip currently active searching cell
    if (cell.state === 'skipped') {
      cell.state = 'unsearched';
      opsManager.dispatchAlert('info', `CELL ${cell.id} RESTORED [SIMULATION]`, 'Cell included back into autonomous search route.');
    } else {
      cell.state = 'skipped';
      opsManager.dispatchAlert('warning', `CELL ${cell.id} SKIPPED [SIMULATION]`, 'Cell marked as bypass / no-fly zone.');
    }
    this.updateCellVisual(index);
    if (window.simEngine) {
      window.simEngine.updateSearchHUD();
    }
  }

  toggleSearchGrid(visible) {
    if (visible === undefined) visible = !simulationState.showSearchGrid;
    simulationState.showSearchGrid = visible;
    const op = visible ? 0.65 : 0;

    if (this.dashGridPolyline) {
      this.dashGridPolyline.setStyle({ opacity: op });
    }
    if (this.fullGridPolyline) {
      this.fullGridPolyline.setStyle({ opacity: visible ? 0.75 : 0 });
    }

    // Toggle 2D cell grid layers
    this.gridCellLayers.forEach((layer) => {
      if (layer) {
        if (visible) {
          if (!this.fullMap.hasLayer(layer)) layer.addTo(this.fullMap);
        } else {
          if (this.fullMap.hasLayer(layer)) this.fullMap.removeLayer(layer);
        }
      }
    });

    // Toggle markers display
    const displayStyle = visible ? '' : 'none';
    this.dashWaypointMarkers.forEach((m) => {
      const el = m.getElement();
      if (el) el.style.display = displayStyle;
    });
    this.fullWaypointMarkers.forEach((m) => {
      const el = m.getElement();
      if (el) el.style.display = displayStyle;
    });

    if (DOM.btnToggleGridOverlay) {
      DOM.btnToggleGridOverlay.classList.toggle('active', visible);
      const span = DOM.btnToggleGridOverlay.querySelector('span');
      if (span) span.textContent = visible ? 'Search Grid [ON]' : 'Search Grid [OFF]';
    }
    if (DOM.btnToggleDashGrid) {
      DOM.btnToggleDashGrid.classList.toggle('active', visible);
    }
  }

  toggleBreadcrumbs(visible) {
    if (visible === undefined) visible = !simulationState.showBreadcrumbs;
    simulationState.showBreadcrumbs = visible;
    const op = visible ? 0.8 : 0;
    if (this.flightPathPolyline) this.flightPathPolyline.setStyle({ opacity: op });
    if (this.fullFlightPathPolyline) this.fullFlightPathPolyline.setStyle({ opacity: visible ? 0.85 : 0 });

    if (DOM.btnToggleDashTrail) {
      DOM.btnToggleDashTrail.classList.toggle('active', visible);
    }
  }

  clearBreadcrumbs() {
    this.flightBreadcrumbs = [];
    if (this.flightPathPolyline) this.flightPathPolyline.setLatLngs([]);
    if (this.fullFlightPathPolyline) this.fullFlightPathPolyline.setLatLngs([]);
    opsManager.dispatchAlert('info', 'BREADCRUMBS CLEARED [SIMULATION]', 'Flight track history cleared from map display.');
  }

  enableMapClickNavigation() {
    const handleMapClick = (e) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      const droneLat = simulationState.latitude;
      const droneLon = simulationState.longitude;
      const dist = Math.round(calcDistanceMeters(droneLat, droneLon, lat, lon));
      const bearing = Math.round(calcBearingDegrees(droneLat, droneLon, lat, lon));

      const popupContent = `
        <div class="popup-title" style="color: var(--accent-amber);">
          <i class="fa-solid fa-crosshairs"></i> TACTICAL COORDINATE INSPECT
        </div>
        <div class="popup-item"><b>COORDINATES:</b> ${lat.toFixed(5)}°N, ${lon.toFixed(5)}°W</div>
        <div class="popup-item"><b>RANGE:</b> ${dist}m from drone</div>
        <div class="popup-item"><b>BEARING:</b> ${bearing}°</div>
        <button class="btn-popup-dispatch" style="margin-top:8px; width:100%;" onclick="window.simEngine.dispatchToTarget('POI (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)', ${lat}, ${lon}); if(window.mapManager.fullMap) window.mapManager.fullMap.closePopup();">
          <i class="fa-solid fa-play"></i> Fly Drone Here (Sim)
        </button>
      `;

      L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(this.fullMap || this.dashboardMap);
    };

    if (this.dashboardMap) {
      this.dashboardMap.on('click', handleMapClick);
    }
    if (this.fullMap) {
      this.fullMap.on('click', handleMapClick);
    }
  }

  setCustomTargetMarker(lat, lon, name) {
    this.clearCustomTargetMarker();

    const targetIcon = L.divIcon({
      className: 'custom-target-dispatch-icon',
      html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(245, 158, 11, 0.3); border: 2px solid var(--accent-amber); box-shadow: 0 0 14px var(--accent-amber); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px;"><i class="fa-solid fa-crosshairs"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const popupHtml = `
      <div class="popup-title" style="color: var(--accent-amber);">
        <i class="fa-solid fa-crosshairs"></i> ${name}
      </div>
      <div class="popup-item">TARGET GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°W</div>
      <div class="popup-item" style="color: var(--accent-amber);"><b>DISPATCH ACTIVE (SIM)</b></div>
    `;

    if (this.dashboardMap) {
      this.dashCustomMarker = L.marker([lat, lon], { icon: targetIcon }).addTo(this.dashboardMap).bindPopup(popupHtml);
    }
    if (this.fullMap) {
      this.fullCustomMarker = L.marker([lat, lon], { icon: targetIcon }).addTo(this.fullMap).bindPopup(popupHtml);
    }
  }

  clearCustomTargetMarker() {
    if (this.dashCustomMarker && this.dashboardMap) {
      this.dashboardMap.removeLayer(this.dashCustomMarker);
      this.dashCustomMarker = null;
    }
    if (this.fullCustomMarker && this.fullMap) {
      this.fullMap.removeLayer(this.fullCustomMarker);
      this.fullCustomMarker = null;
    }
  }

  renderVictimMarkers() {
    // Clear existing markers
    this.victimMarkers.forEach((m) => {
      if (this.dashboardMap) this.dashboardMap.removeLayer(m);
      if (this.fullMap) this.fullMap.removeLayer(m);
    });
    this.victimMarkers = [];

    const victimIcon = L.icon({
      iconUrl: 'assets/victim-icon.svg',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -16]
    });

    STATE.detections.forEach((target) => {
      const pos = [target.lat, target.lon];
      const popupHtml = `
        <div class="popup-title" style="color: var(--accent-rose);">
          <i class="fa-solid fa-triangle-exclamation"></i> ${target.id}
        </div>
        <div class="popup-item"><b>CLASSIFICATION:</b> ${target.label}</div>
        <div class="popup-item"><b>CONFIDENCE:</b> ${(target.confidence * 100).toFixed(1)}%</div>
        <div class="popup-item"><b>THERMAL TEMP:</b> ${target.thermalTemp}</div>
        <div class="popup-item"><b>STATUS:</b> ${target.status}</div>
        <div class="popup-item"><b>DETECTED:</b> ${target.timestamp}</div>
        <button class="btn-popup-dispatch" onclick="window.simEngine.dispatchToTarget('${target.id}', ${target.lat}, ${target.lon})">
          <i class="fa-solid fa-crosshairs"></i> Dispatch Drone to Target
        </button>
      `;

      if (this.dashboardMap) {
        const m1 = L.marker(pos, { icon: victimIcon }).addTo(this.dashboardMap).bindPopup(popupHtml);
        this.victimMarkers.push(m1);
      }

      if (this.fullMap) {
        const m2 = L.marker(pos, { icon: victimIcon }).addTo(this.fullMap).bindPopup(popupHtml);
        this.victimMarkers.push(m2);
      }
    });
  }

  updateDronePosition(lat, lon, heading) {
    const pos = [lat, lon];

    if (this.droneMarkerDashboard) {
      this.droneMarkerDashboard.setLatLng(pos);
    }
    if (this.droneMarkerFull) {
      this.droneMarkerFull.setLatLng(pos);
    }

    // Append to breadcrumb trail
    this.flightBreadcrumbs.push(pos);
    if (this.flightBreadcrumbs.length > 300) {
      this.flightBreadcrumbs.shift();
    }
    if (this.flightPathPolyline && simulationState.showBreadcrumbs) {
      this.flightPathPolyline.setLatLngs(this.flightBreadcrumbs);
    }
    if (this.fullFlightPathPolyline && simulationState.showBreadcrumbs) {
      this.fullFlightPathPolyline.setLatLngs(this.flightBreadcrumbs);
    }
  }

  centerDrone() {
    const pos = [STATE.telemetry.lat, STATE.telemetry.lon];
    if (this.dashboardMap) this.dashboardMap.setView(pos, 15);
    if (this.fullMap) this.fullMap.setView(pos, 16);
  }

  fitGeofence() {
    if (this.geofenceCircle && this.dashboardMap) {
      this.dashboardMap.fitBounds(this.geofenceCircle.getBounds());
    }
  }

  invalidateSizes() {
    setTimeout(() => {
      if (this.dashboardMap) this.dashboardMap.invalidateSize();
      if (this.fullMap) this.fullMap.invalidateSize();
    }, 200);
  }
}

const mapManager = new MapManager();

// ============================================================================
// Simulation Physics & Telemetry Engine (Phase 2 Foundation)
// ============================================================================
class SimulationEngine {
  constructor() {
    this.timerId = null;
    this.searchTimerId = null;
    this.intervalMs = 1000;
    this.flightStep = 0;
    this.savedFlightStatus = null;
  }

  /**
   * Start or resume the periodic simulation loop.
   * Clears any active timer to prevent duplicates.
   */
  start() {
    this.stopTimer();

    simulationState.simulationEnabled = true;
    if (simulationState.flightStatus === 'SIM PAUSED') {
      simulationState.flightStatus = this.savedFlightStatus || (simulationState.isArmed ? 'IN FLIGHT' : 'DISARMED');
    }

    this.timerId = setInterval(() => this.tick(), this.intervalMs);

    this.updateControlsUI();
    this.updateDashboardUI();
  }

  /**
   * Stop or pause the simulation loop.
   * Completely stops periodic timer updates.
   */
  stop() {
    this.stopTimer();

    if (simulationState.flightStatus !== 'SIM PAUSED') {
      this.savedFlightStatus = simulationState.flightStatus;
    }
    simulationState.simulationEnabled = false;
    simulationState.flightStatus = 'SIM PAUSED';

    this.updateControlsUI();
    this.updateDashboardUI();
  }

  /**
   * Clear the active timer cleanly.
   */
  stopTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.stopSearchTimer();
  }

  /**
   * Toggle between active and paused simulation states.
   */
  toggle() {
    if (simulationState.simulationEnabled) {
      this.stop();
      opsManager.dispatchAlert('warning', 'SIMULATION PAUSED', 'Telemetry engine paused. Sensor updates and coordinate movement halted.');
    } else {
      this.start();
      opsManager.dispatchAlert('info', 'SIMULATION RESUMED', 'Telemetry engine active. Simulated SAR flight in progress.');
    }
  }

  // ==========================================================================
  // Phase 2 - Step 2: Flight Control Commands & Safety Logic
  // ==========================================================================

  /**
   * Update the tactical safety advisory banner with clear status feedback.
   */
  setAdvisory(type, label, message) {
    simulationState.advisoryType = type;
    simulationState.advisoryMsg = message;

    if (DOM.controlSafetyAdvisory) {
      DOM.controlSafetyAdvisory.className = `safety-advisory-bar ${type}`;
    }
    if (DOM.advisoryLabel) DOM.advisoryLabel.textContent = label;
    if (DOM.advisoryMessage) DOM.advisoryMessage.textContent = message;
    if (DOM.advisoryIcon) {
      let iconClass = 'fa-solid fa-shield-check';
      if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';
      else if (type === 'danger') iconClass = 'fa-solid fa-ban';
      else if (type === 'success') iconClass = 'fa-solid fa-circle-check';
      DOM.advisoryIcon.innerHTML = `<i class="${iconClass}"></i>`;
    }
  }

  arm() {
    if (!simulationState.isArmed) {
      return this.toggleArm();
    }
    return true;
  }

  disarm() {
    if (simulationState.isArmed) {
      if (simulationState.altitude > 1.0) {
        simulationState.altitude = 0.0;
        simulationState.flightStatus = 'LANDED';
      }
      return this.toggleArm();
    }
    return true;
  }

  /**
   * Command: ARM / DISARM (SIMULATION)
   * Safety Logic:
   * - Prevent duplicate ARM / DISARM actions.
   * - Prevent DISARM when airborne (altitude > 1.0m).
   */
  toggleArm() {
    const s = simulationState;
    const prevState = s.flightStatus;

    if (s.isArmed) {
      // Safety guard: Prevent DISARM while airborne!
      if (s.altitude > 1.0 || (s.flightStatus !== 'LANDED' && s.flightStatus !== 'ARMED')) {
        this.setAdvisory('danger', 'SAFETY GUARD BLOCKED:', `Cannot DISARM while airborne (Alt: ${s.altitude.toFixed(1)}m)! Land drone before disarming.`);
        opsManager.dispatchAlert('critical', 'CMD BLOCKED: DISARM [SIMULATION]', `Safety interlock: Cannot disarm while airborne (Alt: ${s.altitude.toFixed(1)}m). Current state: ${prevState}.`);
        audioSynth.playBeep(400, 0.2, 'sawtooth');
        return false;
      }

      // Safe to disarm on ground
      s.isArmed = false;
      s.flightStatus = 'DISARMED';
      s.missionStatus = 'PRE-FLIGHT CHECKS / DISARMED';
      s.groundSpeed = 0.0;
      s.climbRate = 0.0;
      s.altitude = 0.0;
      this.setAdvisory('warning', 'SIMULATION ADVISORY:', 'Drone DISARMED. Propellers powered down. Arm drone to enable takeoff.');
      opsManager.dispatchAlert('warning', 'CMD: DISARM [SIMULATION]', `Previous: ${prevState} ➔ New: DISARMED. Motors powered down safely.`);
      audioSynth.playBeep(480, 0.15, 'sine');
    } else {
      // ARM drone
      s.isArmed = true;
      s.flightStatus = 'ARMED';
      s.missionStatus = 'MOTORS ARMED - READY FOR TAKEOFF';
      this.setAdvisory('success', 'SIMULATION ADVISORY:', 'Motors ARMED and spinning at idle RPM. Ready for TAKEOFF command.');
      opsManager.dispatchAlert('info', 'CMD: ARM [SIMULATION]', `Previous: ${prevState} ➔ New: ARMED. Flight controller armed (SIM).`);
      audioSynth.playBeep(880, 0.15, 'sine');
    }

    this.updateControlsUI();
    this.updateDashboardUI();
    return true;
  }

  /**
   * Command: TAKEOFF (SIMULATION)
   * Safety Logic:
   * - Prevent TAKEOFF when disarmed.
   * - Prevent TAKEOFF when already airborne.
   */
  takeoff() {
    const s = simulationState;
    const prevState = s.flightStatus;

    // Safety guard 1: Must be armed
    if (!s.isArmed) {
      this.setAdvisory('danger', 'TAKEOFF BLOCKED:', 'Drone is DISARMED! You must ARM motors before initiating takeoff.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: TAKEOFF [SIMULATION]', 'Takeoff rejected: Drone is DISARMED.');
      audioSynth.playBeep(350, 0.25, 'sawtooth');
      return false;
    }

    // Safety guard 2: Must not already be airborne
    if (s.altitude > 1.0 || s.flightStatus === 'IN FLIGHT' || s.flightStatus === 'TAKING OFF' || s.flightStatus === 'HOLDING POSITION' || s.flightStatus === 'RETURNING TO LAUNCH') {
      this.setAdvisory('warning', 'TAKEOFF BLOCKED:', `Drone is already airborne at ${s.altitude.toFixed(1)}m AGL. Takeoff redundant.`);
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: TAKEOFF [SIMULATION]', `Takeoff rejected: Drone already airborne at ${s.altitude.toFixed(1)}m.`);
      audioSynth.playBeep(450, 0.15, 'sawtooth');
      return false;
    }

    // Initiate Takeoff
    s.flightStatus = 'TAKING OFF';
    s.missionStatus = 'TAKEOFF ASCENT (CLIMBING TO 48M)';
    s.climbRate = 3.2;
    this.setAdvisory('success', 'TAKEOFF SEQUENCE:', 'Simulating vertical ascent to 48m search ceiling (+3.2 m/s climb rate).');
    opsManager.dispatchAlert('info', 'CMD: TAKEOFF [SIMULATION]', `Previous: ${prevState} ➔ New: TAKING OFF. Vertical ascent started.`);
    audioSynth.playBeep(750, 0.2, 'triangle');

    // Auto-resume simulation if it was paused
    if (!s.simulationEnabled) {
      this.start();
    }

    this.updateControlsUI();
    this.updateDashboardUI();
    return true;
  }

  /**
   * Command: HOLD POSITION (LOITER)
   * Safety Logic:
   * - Prevent HOLD when disarmed or on ground.
   * - Toggles back to IN FLIGHT if already holding.
   */
  hold() {
    const s = simulationState;
    const prevState = s.flightStatus;

    // Safety guard: Cannot hold while on ground
    if (s.altitude <= 0.2 || s.flightStatus === 'LANDED' || s.flightStatus === 'DISARMED') {
      this.setAdvisory('warning', 'HOLD POSITION BLOCKED:', 'Cannot hold position while drone is landed on the ground. Takeoff first.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: HOLD [SIMULATION]', 'Hold position rejected: Drone is on the ground.');
      audioSynth.playBeep(400, 0.18, 'sawtooth');
      return false;
    }

    if (s.flightStatus === 'HOLDING POSITION') {
      // Resume regular search flight
      s.flightStatus = 'IN FLIGHT';
      s.missionStatus = 'SEARCHING SECTOR 7B';
      this.setAdvisory('nominal', 'AUTO-SEARCH RESUMED:', 'Resuming autonomous lawnmower search grid over Sector 7B.');
      opsManager.dispatchAlert('info', 'CMD: RESUME GRID [SIMULATION]', 'Previous: HOLDING POSITION ➔ New: IN FLIGHT. Auto-search active.');
      audioSynth.playBeep(680, 0.15, 'sine');
    } else {
      // Engage Hold Position
      s.flightStatus = 'HOLDING POSITION';
      s.missionStatus = 'LOITERING / POSITION HOLD';
      s.climbRate = 0.0;
      s.groundSpeed = 0.0;
      this.setAdvisory('nominal', 'POSITION HOLD ACTIVE:', 'Autopilot hovering in place. Forward cruise speed reduced to 0.0 m/s.');
      opsManager.dispatchAlert('info', 'CMD: HOLD POSITION [SIMULATION]', `Previous: ${prevState} ➔ New: HOLDING POSITION. Loiter mode engaged.`);
      audioSynth.playBeep(640, 0.18, 'sine');
    }

    this.updateControlsUI();
    this.updateDashboardUI();
    return true;
  }

  /**
   * Command: LAND (SIMULATION)
   * Safety Logic:
   * - Prevent LAND when already landed or disarmed on ground.
   * - Prevent duplicate LAND command when already landing.
   */
  land() {
    const s = simulationState;
    const prevState = s.flightStatus;

    // Safety guard 1: Cannot land if already on ground
    if (s.altitude <= 0.2 || s.flightStatus === 'LANDED' || s.flightStatus === 'DISARMED') {
      this.setAdvisory('warning', 'LAND COMMAND BLOCKED:', 'Drone is already landed on the ground.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: LAND [SIMULATION]', 'Land command rejected: Drone is already landed.');
      audioSynth.playBeep(400, 0.18, 'sawtooth');
      return false;
    }

    // Safety guard 2: Duplicate land
    if (s.flightStatus === 'LANDING') {
      this.setAdvisory('warning', 'LAND IN PROGRESS:', 'Autonomous landing descent is already in progress.');
      return false;
    }

    s.flightStatus = 'LANDING';
    s.missionStatus = 'AUTONOMOUS TOUCHDOWN DESCENT';
    s.climbRate = -2.6;
    this.setAdvisory('warning', 'LANDING SEQUENCE:', 'Autonomous descent initiated (-2.6 m/s). Speed decelerating to touchdown.');
    opsManager.dispatchAlert('warning', 'CMD: LAND [SIMULATION]', `Previous: ${prevState} ➔ New: LANDING. Autonomous descent initiated.`);
    audioSynth.playBeep(520, 0.22, 'sine');

    this.updateControlsUI();
    this.updateDashboardUI();
    return true;
  }

  /**
   * Command: RETURN TO LAUNCH (RTL)
   * Safety Logic:
   * - Prevent RTL when on the ground.
   * - Prevent duplicate RTL.
   */
  rtl() {
    const s = simulationState;
    const prevState = s.flightStatus;

    // Safety guard 1: Cannot RTL if on the ground
    if (s.altitude <= 0.2 || s.flightStatus === 'LANDED' || s.flightStatus === 'DISARMED') {
      this.setAdvisory('warning', 'RTL COMMAND BLOCKED:', 'Cannot Return to Launch while drone is on the ground. Takeoff first.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: RTL [SIMULATION]', 'RTL command rejected: Drone is on the ground.');
      audioSynth.playBeep(400, 0.18, 'sawtooth');
      return false;
    }

    // Safety guard 2: Duplicate RTL
    if (s.flightStatus === 'RETURNING TO LAUNCH') {
      this.setAdvisory('warning', 'RTL IN PROGRESS:', 'Drone is already returning to Launch Point.');
      return false;
    }

    s.flightStatus = 'RETURNING TO LAUNCH';
    s.missionStatus = 'TRANSIT TO LAUNCH PAD (RTL)';
    this.setAdvisory('danger', 'RTL FAILSAFE ACTIVE:', 'Autopilot navigating back to Launch Base (34.2500°N, 118.1500°W) at 15 m/s.');
    opsManager.dispatchAlert('critical', 'CMD: RETURN TO LAUNCH [SIMULATION]', `Previous: ${prevState} ➔ New: RETURNING TO LAUNCH. Navigating to launch pad.`);
    audioSynth.playBeep(880, 0.25, 'sine');

    this.updateControlsUI();
    this.updateDashboardUI();
    return true;
  }

  // ==========================================================================
  // Phase 2 - Step 3: Search Grid, Waypoint Navigation & Target Dispatch
  // ==========================================================================

  /**
   * Dispatch drone directly to investigate coordinates or victim beacon.
   * Safety Interlock: Blocks dispatch if drone is disarmed or on the ground.
   */
  dispatchToTarget(arg1, arg2, arg3) {
    let name, lat, lon;
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      lat = arg1;
      lon = arg2;
      name = arg3 || `POI (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°W)`;
    } else {
      name = arg1 || 'TARGET POI';
      lat = Number(arg2);
      lon = Number(arg3);
    }

    const s = simulationState;

    if (s.altitude <= 0.2 || s.flightStatus === 'LANDED' || s.flightStatus === 'DISARMED') {
      this.setAdvisory('warning', 'DISPATCH BLOCKED:', 'Drone is on the ground. Arm motors and takeoff before commanding waypoint dispatch.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: DISPATCH [SIMULATION]', `Target dispatch rejected: Drone on ground (${s.flightStatus}).`);
      audioSynth.playBeep(380, 0.25, 'sawtooth');
      return false;
    }

    s.customTarget = { name, lat, lon };
    s.navigationMode = 'TARGET_DISPATCH';
    s.targetName = name;
    s.targetLatitude = lat;
    s.targetLongitude = lon;
    s.flightStatus = 'IN FLIGHT';
    s.missionStatus = `INVESTIGATING: ${name}`;

    mapManager.setCustomTargetMarker(lat, lon, name);
    this.setAdvisory('nominal', 'DISPATCH IN PROGRESS:', `Autopilot rerouted to investigate ${name} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°W) at 14.2 m/s.`);
    opsManager.dispatchAlert('warning', 'CMD: TARGET DISPATCH [SIMULATION]', `Autopilot rerouted to investigate ${name} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°W).`);
    audioSynth.playBeep(920, 0.15, 'sine');

    this.updateControlsUI();
    this.updateWaypointHUD();
    return true;
  }

  /**
   * Resume standard Sector 7B lawnmower search grid navigation.
   */
  resumeSearchGrid() {
    const s = simulationState;
    s.customTarget = null;
    s.navigationMode = 'AUTO_GRID';
    s.flightStatus = 'IN FLIGHT';
    s.missionStatus = 'SEARCHING SECTOR 7B';

    mapManager.clearCustomTargetMarker();
    const curWp = SEARCH_GRID_WAYPOINTS[s.activeWaypointIndex];
    s.targetName = curWp.id;
    s.targetLatitude = curWp.lat;
    s.targetLongitude = curWp.lon;

    this.setAdvisory('nominal', 'SEARCH GRID RESUMED:', `Autopilot returned to Sector 7B lawnmower pattern. Heading towards ${curWp.id}.`);
    opsManager.dispatchAlert('info', 'RESUMED SEARCH GRID [SIMULATION]', `Target reset to ${curWp.id}. Resuming lawnmower coverage.`);
    audioSynth.playBeep(720, 0.15, 'sine');

    this.updateControlsUI();
    this.updateWaypointHUD();
    return true;
  }

  /**
   * Reset search grid sequence back to WP-01.
   */
  resetWaypoints() {
    const s = simulationState;
    s.activeWaypointIndex = 0;
    s.customTarget = null;
    s.navigationMode = 'AUTO_GRID';

    mapManager.clearCustomTargetMarker();
    const firstWp = SEARCH_GRID_WAYPOINTS[0];
    s.targetName = firstWp.id;
    s.targetLatitude = firstWp.lat;
    s.targetLongitude = firstWp.lon;
    s.missionProgress = 12.5;

    mapManager.updateWaypointHighlights(0);
    this.renderWaypointTable();
    this.updateWaypointHUD();
    opsManager.dispatchAlert('info', 'WAYPOINTS RESET [SIMULATION]', 'Autopilot navigation sequence reset to WP-01.');
    audioSynth.playBeep(800, 0.1, 'sine');
  }

  /**
   * Toggle between autonomous search grid and position hold.
   */
  toggleAutoGrid() {
    const s = simulationState;
    if (s.navigationMode === 'AUTO_GRID' && s.flightStatus === 'IN FLIGHT') {
      this.hold();
    } else {
      this.resumeSearchGrid();
    }
  }

  /**
   * Render all 8 waypoint rows in the Mission Map sidebar table.
   */
  renderWaypointTable() {
    if (!DOM.waypointTableBody) return;
    DOM.waypointTableBody.innerHTML = '';

    SEARCH_GRID_WAYPOINTS.forEach((wp, idx) => {
      const tr = document.createElement('tr');
      tr.id = `wpRow_${wp.id}`;

      let statusPillClass = 'pending';
      let statusText = 'PENDING';
      if (idx === simulationState.activeWaypointIndex) {
        statusPillClass = 'active';
        statusText = 'ACTIVE';
        tr.className = 'active wp-row-active';
      } else if (idx < simulationState.activeWaypointIndex) {
        statusPillClass = 'completed';
        statusText = 'DONE';
        tr.className = 'completed';
      }

      tr.innerHTML = `
        <td><b>${wp.id}</b></td>
        <td>${wp.lat.toFixed(4)}°, ${wp.lon.toFixed(4)}°</td>
        <td>${wp.leg}</td>
        <td><span class="wp-status-pill ${statusPillClass}" id="wpPill_${wp.id}">${statusText}</span></td>
      `;

      tr.addEventListener('click', () => {
        simEngine.dispatchToTarget(wp.id, wp.lat, wp.lon);
      });

      DOM.waypointTableBody.appendChild(tr);
    });
  }

  /**
   * Update the Tactical Waypoint Navigation HUD & Mission Sequence Panel
   */
  updateWaypointHUD() {
    const s = simulationState;

    // 1. Dashboard mini-badge
    if (DOM.dashWpText) {
      DOM.dashWpText.textContent = s.targetName || 'WP-01';
    }

    // 2. Active Target Navigation Card
    if (DOM.navTargetName) {
      if (s.navigationMode === 'TARGET_DISPATCH' && s.customTarget) {
        DOM.navTargetName.textContent = `TARGET: ${s.customTarget.name}`;
      } else {
        const curWp = SEARCH_GRID_WAYPOINTS[s.activeWaypointIndex];
        DOM.navTargetName.textContent = curWp ? curWp.name : 'WP-01 // SECTOR 7B ENTRY';
      }
    }

    if (DOM.navTargetCoords) {
      DOM.navTargetCoords.textContent = `${s.targetLatitude.toFixed(4)}°N, ${s.targetLongitude.toFixed(4)}°W`;
    }

    if (DOM.navTargetPill) {
      if (s.navigationMode === 'TARGET_DISPATCH') {
        DOM.navTargetPill.textContent = 'DIRECT DISPATCH (SIM)';
        DOM.navTargetPill.className = 'nav-status-badge dispatch';
      } else {
        DOM.navTargetPill.textContent = 'AUTO-GRID';
        DOM.navTargetPill.className = 'nav-status-badge active';
      }
    }

    if (DOM.navBearingVal) {
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const dirIndex = Math.round(s.bearingToTarget / 22.5) % 16;
      DOM.navBearingVal.textContent = `${s.bearingToTarget}° ${directions[dirIndex]}`;
    }

    if (DOM.navDistanceVal) {
      DOM.navDistanceVal.textContent = `${Math.round(s.distanceToTarget)}m`;
    }

    if (DOM.navEtaVal) {
      if (s.groundSpeed > 0.5) {
        const etaSecs = Math.round(s.distanceToTarget / s.groundSpeed);
        const m = String(Math.floor(etaSecs / 60)).padStart(2, '0');
        const sec = String(etaSecs % 60).padStart(2, '0');
        DOM.navEtaVal.textContent = `${m}:${sec}`;
      } else {
        DOM.navEtaVal.textContent = '--:--';
      }
    }

    if (DOM.navSpeedVal) {
      DOM.navSpeedVal.textContent = `${s.groundSpeed.toFixed(1)} m/s`;
    }

    if (DOM.navGridProgressText) {
      DOM.navGridProgressText.textContent = `${s.missionProgress}% (Leg ${s.activeWaypointIndex + 1}/8)`;
    }
    if (DOM.navGridProgressBar) {
      DOM.navGridProgressBar.style.width = `${s.missionProgress}%`;
    }

    // 3. Dispatch control box & resume button
    if (DOM.btnResumeGrid) {
      DOM.btnResumeGrid.style.display = s.navigationMode === 'TARGET_DISPATCH' ? 'inline-flex' : 'none';
    }
    if (DOM.dispatchStatusText) {
      if (s.navigationMode === 'TARGET_DISPATCH') {
        DOM.dispatchStatusText.innerHTML = `<span style="color: var(--accent-amber);"><i class="fa-solid fa-crosshairs"></i> Investigating custom target: <b>${s.targetName}</b> (${Math.round(s.distanceToTarget)}m away)</span>`;
      } else {
        DOM.dispatchStatusText.textContent = 'Click any position on the tactical map or select a victim marker to command direct drone investigation.';
      }
    }

    // 4. Update Table Row Classes & Status Pills
    SEARCH_GRID_WAYPOINTS.forEach((wp, idx) => {
      const row = document.getElementById(`wpRow_${wp.id}`);
      const pill = document.getElementById(`wpPill_${wp.id}`);
      if (row && pill) {
        if (s.navigationMode === 'AUTO_GRID') {
          if (idx === s.activeWaypointIndex) {
            row.className = 'active wp-row-active';
            pill.className = 'wp-status-pill active';
            pill.textContent = 'ACTIVE';
          } else if (idx < s.activeWaypointIndex) {
            row.className = 'completed';
            pill.className = 'wp-status-pill completed';
            pill.textContent = 'DONE';
          } else {
            row.className = '';
            pill.className = 'wp-status-pill pending';
            pill.textContent = 'PENDING';
          }
        } else {
          // If in dispatch mode, highlight row if matching wp id
          if (wp.id === s.targetName) {
            row.className = 'active wp-row-active';
            pill.className = 'wp-status-pill active';
            pill.textContent = 'TARGET';
          }
        }
      }
    });

    // 5. Floating Map HUD
    if (DOM.mapHudMode) {
      DOM.mapHudMode.textContent = s.navigationMode === 'TARGET_DISPATCH' ? 'TARGET DISPATCH: ACTIVE' : 'AUTO-GRID: ACTIVE';
    }
    if (DOM.mapHudTarget) {
      DOM.mapHudTarget.textContent = `${s.targetName} (${s.targetLatitude.toFixed(4)}°N, ${s.targetLongitude.toFixed(4)}°W)`;
    }
    if (DOM.mapHudDist) {
      DOM.mapHudDist.textContent = `${Math.round(s.distanceToTarget)}m`;
    }

    // 6. Geofence Radar Card
    if (DOM.geofenceLaunchDist) {
      DOM.geofenceLaunchDist.textContent = `${Math.round(s.launchDistance)}m`;
    }
    if (DOM.geofenceLimitVal) {
      DOM.geofenceLimitVal.textContent = `${STATE.settings.geofenceRadius.toLocaleString()}m`;
    }
    if (DOM.geofenceClearanceVal) {
      DOM.geofenceClearanceVal.textContent = `${Math.round(s.geofenceClearance)}m`;
      DOM.geofenceClearanceVal.style.color = s.geofenceClearance < 100 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
    }
    if (DOM.geofenceStatusPill) {
      if (s.geofenceBreach) {
        DOM.geofenceStatusPill.textContent = 'BREACH DETECTED';
      } else {
        DOM.geofenceStatusPill.textContent = 'CONTAINED';
        DOM.geofenceStatusPill.className = 'geofence-status-pill ok';
      }
    }
  }

  // ==========================================================================
  // Phase 2 - Step 3: Autonomous Search Grid Mission Controls & Execution
  // ==========================================================================

  /**
   * Start Autonomous Search Grid sweep over Sector 7B matrix.
   * Safety guard: Drone must be armed and airborne!
   */
  startAutonomousSearch() {
    const s = simulationState;

    if (!s.isArmed || s.altitude < 1.0 || s.flightStatus === 'DISARMED' || s.flightStatus === 'LANDED') {
      this.setAdvisory('danger', 'TAKEOFF REQUIRED:', 'Drone must be ARMED and airborne (>1m) before starting autonomous search grid.');
      opsManager.dispatchAlert('warning', 'CMD BLOCKED: SEARCH GRID [SIMULATION]', 'Autonomous search rejected: Drone must be airborne.');
      audioSynth.playBeep(360, 0.2, 'sawtooth');
      return false;
    }

    this.stopSearchTimer();

    s.searchExecutionState = 'RUNNING';
    s.navigationMode = 'AUTO_GRID';
    s.flightStatus = 'IN FLIGHT';
    s.missionStatus = `SWEEPING SECTOR 7B (${s.gridSize}x${s.gridSize})`;

    // Compute interval from speed setting
    let interval = 1000;
    if (s.searchSpeed === 'slow') interval = 1500;
    else if (s.searchSpeed === 'fast') interval = 500;

    this.setAdvisory('success', 'AUTONOMOUS SEARCH ACTIVE:', `Sweeping Sector 7B matrix (${s.gridSize}x${s.gridSize}, ${s.searchPattern.toUpperCase()}, ${s.searchSpeed} speed).`);
    opsManager.dispatchAlert('info', 'AUTONOMOUS SEARCH STARTED [SIMULATION]', `Started Sector 7B grid sweep (${s.gridSize}x${s.gridSize} cells, ${s.searchPattern}).`);
    audioSynth.playBeep(880, 0.15, 'sine');

    // Perform immediate first step
    this.tickSearchStep();

    // Start interval
    this.searchTimerId = setInterval(() => {
      this.tickSearchStep();
    }, interval);

    this.updateControlsUI();
    this.updateDashboardUI();
    this.updateSearchHUD();
    return true;
  }

  /**
   * Pause Autonomous Search Grid sweep.
   */
  pauseAutonomousSearch() {
    const s = simulationState;
    if (s.searchExecutionState !== 'RUNNING') return false;

    this.stopSearchTimer();
    s.searchExecutionState = 'PAUSED';
    s.flightStatus = 'HOLDING POSITION';
    s.missionStatus = `LOITERING OVER CELL ${s.activeCellId}`;

    this.setAdvisory('warning', 'AUTONOMOUS SEARCH PAUSED:', `Search paused at Cell ${s.activeCellId}. Drone loitering in position.`);
    opsManager.dispatchAlert('warning', 'SEARCH PAUSED [SIMULATION]', `Autonomous search paused at Cell ${s.activeCellId}. Holding coordinates.`);
    audioSynth.playBeep(550, 0.15, 'sine');

    this.updateControlsUI();
    this.updateDashboardUI();
    this.updateSearchHUD();
    return true;
  }

  /**
   * Resume Autonomous Search Grid sweep from paused cell.
   */
  resumeAutonomousSearch() {
    const s = simulationState;
    if (s.searchExecutionState !== 'PAUSED') return false;
    return this.startAutonomousSearch();
  }

  /**
   * Stop Autonomous Search Grid sweep.
   */
  stopAutonomousSearch() {
    const s = simulationState;
    this.stopSearchTimer();
    s.searchExecutionState = 'STOPPED';

    if (s.activeCellIndex >= 0 && mapManager.gridCells[s.activeCellIndex]) {
      const activeCell = mapManager.gridCells[s.activeCellIndex];
      if (activeCell.state === 'searching') {
        activeCell.state = 'unsearched';
        mapManager.updateCellVisual(s.activeCellIndex);
      }
    }

    this.setAdvisory('warning', 'SEARCH GRID TERMINATED:', 'Autonomous search grid halted by operator.');
    opsManager.dispatchAlert('warning', 'SEARCH STOPPED [SIMULATION]', 'Grid sweep terminated. Autopilot standing by.');
    audioSynth.playBeep(450, 0.15, 'sine');

    this.updateControlsUI();
    this.updateDashboardUI();
    this.updateSearchHUD();
    return true;
  }

  /**
   * Reset Autonomous Search Grid back to initial state.
   */
  resetAutonomousSearch() {
    const s = simulationState;
    this.stopSearchTimer();
    s.searchExecutionState = 'IDLE';
    s.activeCellIndex = -1;
    s.activeCellId = 'NONE';
    s.searchedCellsCount = 0;
    s.targetsFoundInGrid = 0;

    mapManager.gridCells.forEach((cell, idx) => {
      if (cell.state !== 'skipped') {
        cell.state = 'unsearched';
        mapManager.updateCellVisual(idx);
      }
    });

    this.setAdvisory('nominal', 'SEARCH GRID RESET:', `Sector 7B matrix reset. ${mapManager.gridCells.length} cells ready for sweep.`);
    opsManager.dispatchAlert('info', 'GRID RESET [SIMULATION]', 'Sector 7B autonomous search grid matrix reset to unsearched state.');
    audioSynth.playBeep(700, 0.1, 'sine');

    this.updateSearchHUD();
    return true;
  }

  /**
   * Clear the active search grid timer interval.
   */
  stopSearchTimer() {
    if (this.searchTimerId !== null) {
      clearInterval(this.searchTimerId);
      this.searchTimerId = null;
    }
  }

  /**
   * Advance one cell in the autonomous search grid traversal sequence.
   */
  tickSearchStep() {
    const s = simulationState;
    if (s.searchExecutionState !== 'RUNNING') return;

    if (!s.isArmed || s.flightStatus === 'DISARMED' || s.flightStatus === 'LANDED') {
      this.stopSearchTimer();
      s.searchExecutionState = 'STOPPED';
      this.updateSearchHUD();
      return;
    }

    // Mark previous searching cell as searched (if it wasn't marked detected)
    const prevIdx = s.activeCellIndex;
    if (prevIdx >= 0 && mapManager.gridCells[prevIdx]) {
      const prevCell = mapManager.gridCells[prevIdx];
      if (prevCell.state === 'searching') {
        prevCell.state = 'searched';
        mapManager.updateCellVisual(prevIdx);
        s.searchedCellsCount++;
      }
    }

    // Find next unsearched cell in traversalSequence
    const seq = mapManager.traversalSequence;
    let nextIdx = -1;
    for (let i = 0; i < seq.length; i++) {
      const cellIdx = seq[i];
      const c = mapManager.gridCells[cellIdx];
      if (c && c.state === 'unsearched') {
        nextIdx = cellIdx;
        break;
      }
    }

    // If no unsearched cells remain, mission complete!
    if (nextIdx === -1) {
      this.stopSearchTimer();
      s.searchExecutionState = 'COMPLETED';
      s.flightStatus = 'HOLDING POSITION';
      s.missionStatus = 'SECTOR 7B SWEEP COMPLETED';

      this.setAdvisory('success', 'SEARCH GRID COMPLETED:', `All cells in Sector 7B swept! ${s.targetsFoundInGrid} targets located and cataloged.`);
      opsManager.dispatchAlert('critical', 'MISSION GRID COMPLETED [SIMULATION]', `Sector 7B search grid finished. Discovered ${s.targetsFoundInGrid} simulated targets.`);
      audioSynth.playTargetLock();

      this.updateSearchHUD();
      this.updateDashboardUI();
      return;
    }

    // Activate next cell
    s.activeCellIndex = nextIdx;
    const cell = mapManager.gridCells[nextIdx];
    s.activeCellId = cell.id;
    cell.state = 'searching';
    mapManager.updateCellVisual(nextIdx);

    // Update drone flight coordinates to cell center
    const prevLat = s.latitude;
    const prevLon = s.longitude;
    const [cLat, cLon] = cell.center;
    const bearing = Math.round(calcBearingDegrees(prevLat, prevLon, cLat, cLon));

    s.latitude = cLat;
    s.longitude = cLon;
    s.heading = bearing;
    s.groundSpeed = s.searchSpeed === 'fast' ? 18.0 : (s.searchSpeed === 'slow' ? 10.0 : 14.5);
    s.targetName = `CELL ${cell.id}`;
    s.targetLatitude = cLat;
    s.targetLongitude = cLon;

    mapManager.updateDronePosition(cLat, cLon, bearing);

    // Simulated Target Discovery
    // Trigger detection if cell bounds enclose an existing detection or key simulated cells
    const victimInCell = STATE.detections.find((d) => {
      const south = cell.bounds[0][0], west = cell.bounds[0][1];
      const north = cell.bounds[1][0], east = cell.bounds[1][1];
      return d.lat >= south && d.lat <= north && d.lon >= west && d.lon <= east;
    });

    const isDiscoveryCell = victimInCell || (nextIdx === 4 && s.targetsFoundInGrid === 0) || (nextIdx === 11 && s.targetsFoundInGrid === 1) || (nextIdx === 22 && s.targetsFoundInGrid === 2);

    if (isDiscoveryCell) {
      cell.state = 'detected';
      mapManager.updateCellVisual(nextIdx);
      s.targetsFoundInGrid++;
      s.searchedCellsCount++;

      const targetId = victimInCell ? victimInCell.id : `CASUALTY-0${s.targetsFoundInGrid}`;
      this.setAdvisory('danger', 'TARGET DETECTED IN GRID:', `Casualty detected in Cell ${cell.id} (${cLat.toFixed(4)}°N, ${cLon.toFixed(4)}°W)!`);
      opsManager.dispatchAlert('critical', 'TARGET DETECTED [SIMULATION]', `Heat signature identified in Cell ${cell.id}. Target ${targetId} added to tactical catalog.`);
      audioSynth.playTargetLock();
    }

    this.updateSearchHUD();
    this.updateDashboardUI();
  }

  /**
   * Update all DOM elements for Search Grid Progress Card & HUD
   */
  updateSearchHUD() {
    const s = simulationState;

    // 1. Execution Badge
    if (DOM.searchExecutionBadge) {
      DOM.searchExecutionBadge.textContent = s.searchExecutionState;
      DOM.searchExecutionBadge.className = `tactical-status-badge ${s.searchExecutionState.toLowerCase()}`;
    }

    // 2. Active Cell Information
    if (DOM.searchActiveCellLabel) {
      DOM.searchActiveCellLabel.textContent = s.activeCellId || 'NONE';
    }

    if (DOM.searchActiveCellStatePill) {
      if (s.activeCellIndex >= 0 && mapManager.gridCells[s.activeCellIndex]) {
        const curCell = mapManager.gridCells[s.activeCellIndex];
        DOM.searchActiveCellStatePill.textContent = curCell.state.toUpperCase();
        DOM.searchActiveCellStatePill.className = `cell-status-tag ${curCell.state}`;
      } else {
        DOM.searchActiveCellStatePill.textContent = 'IDLE';
        DOM.searchActiveCellStatePill.className = 'cell-status-tag unsearched';
      }
    }

    if (DOM.searchActiveCellCoords) {
      if (s.activeCellIndex >= 0 && mapManager.gridCells[s.activeCellIndex]) {
        const curCell = mapManager.gridCells[s.activeCellIndex];
        DOM.searchActiveCellCoords.textContent = `${curCell.center[0].toFixed(4)}°N, ${curCell.center[1].toFixed(4)}°W`;
      } else {
        DOM.searchActiveCellCoords.textContent = '34.2500°N, 118.1500°W';
      }
    }

    // 3. Metrics Counters
    const total = s.totalCellsCount || 36;
    const done = Math.min(total, s.searchedCellsCount);
    const remaining = Math.max(0, total - done);
    const percent = Math.round((done / total) * 100);

    if (DOM.searchCellsDoneVal) DOM.searchCellsDoneVal.textContent = `${done} / ${total}`;
    if (DOM.searchPercentVal) DOM.searchPercentVal.textContent = `${percent}%`;
    if (DOM.searchCellsRemainingVal) DOM.searchCellsRemainingVal.textContent = `${remaining}`;

    // ETA calculation
    let secPerCell = s.searchSpeed === 'fast' ? 0.5 : (s.searchSpeed === 'slow' ? 1.5 : 1.0);
    const totalSecs = Math.round(remaining * secPerCell);
    const mm = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const ss = String(totalSecs % 60).padStart(2, '0');
    if (DOM.searchEtaVal) DOM.searchEtaVal.textContent = `${mm}:${ss}`;

    // Progress Bar
    if (DOM.searchProgressBar) {
      DOM.searchProgressBar.style.width = `${percent}%`;
    }

    // Targets Found
    if (DOM.searchTargetsFoundCount) {
      DOM.searchTargetsFoundCount.textContent = `${s.targetsFoundInGrid}`;
    }

    // Controls Buttons State & Highlights
    const isRunning = s.searchExecutionState === 'RUNNING';
    const isPaused = s.searchExecutionState === 'PAUSED';

    if (DOM.btnStartSearch) {
      DOM.btnStartSearch.disabled = isRunning;
      DOM.btnStartSearch.style.opacity = isRunning ? '0.5' : '1';
    }
    if (DOM.btnPauseSearch) {
      DOM.btnPauseSearch.disabled = !isRunning;
      DOM.btnPauseSearch.style.opacity = !isRunning ? '0.5' : '1';
    }
    if (DOM.btnResumeSearch) {
      DOM.btnResumeSearch.disabled = !isPaused;
      DOM.btnResumeSearch.style.opacity = !isPaused ? '0.5' : '1';
    }
    if (DOM.btnStopSearch) {
      DOM.btnStopSearch.disabled = !isRunning && !isPaused;
      DOM.btnStopSearch.style.opacity = (!isRunning && !isPaused) ? '0.5' : '1';
    }

    // Floating Map HUD sync
    if (DOM.mapHudMode) {
      DOM.mapHudMode.textContent = isRunning ? 'SEARCH GRID: ACTIVE' : (isPaused ? 'SEARCH GRID: PAUSED' : 'AUTOPILOT: READY');
    }
    if (DOM.mapHudTarget && s.activeCellId !== 'NONE') {
      DOM.mapHudTarget.textContent = `CELL ${s.activeCellId}`;
    }
  }

  /**
   * Periodic tick generating controlled, realistic mock values.
   */
  tick() {
    if (!simulationState.simulationEnabled) {
      this.stopTimer();
      return;
    }

    const mult = STATE.settings.simSpeed;
    const s = simulationState;

    // 1. Advance Flight Clock (when armed or active)
    if (s.flightStatus !== 'DISARMED') {
      s.flightDurationSeconds += mult;
      this.updateClock();
    }

    // 2. Realistic Flight State Dynamics & Physics Simulation
    if (s.flightStatus === 'DISARMED') {
      s.altitude = 0.0;
      s.climbRate = 0.0;
      s.groundSpeed = 0.0;
      s.pitch = 0.0;
      s.roll = 0.0;
      STATE.motors.forEach((m) => { m.rpm = 0; m.fill = 0; });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.001 * mult);
        s.batteryVoltage = 21.0 + (s.batteryPercentage / 100) * 3.8;
      }
    } else if (s.flightStatus === 'ARMED') {
      s.altitude = 0.0;
      s.climbRate = 0.0;
      s.groundSpeed = 0.0;
      s.pitch = 0.0;
      s.roll = 0.0;
      STATE.motors.forEach((m) => { m.rpm = 1200; m.fill = 15; });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.003 * mult);
        s.batteryVoltage = 21.0 + (s.batteryPercentage / 100) * 3.8;
      }
    } else if (s.flightStatus === 'TAKING OFF') {
      s.climbRate = 3.2;
      s.altitude += s.climbRate * mult;
      s.groundSpeed = Math.min(6.0, s.groundSpeed + 1.2 * mult);
      s.pitch = -12.0;
      s.roll = 0.5;
      STATE.motors.forEach((m, idx) => {
        m.rpm = 5800 + Math.round(Math.sin(idx) * 80);
        m.fill = 88;
      });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.035 * mult);
        s.batteryVoltage = 20.2 + (s.batteryPercentage / 100) * 3.8;
      }
      if (s.altitude >= s.targetAltitude) {
        s.altitude = s.targetAltitude;
        s.climbRate = 0.0;
        s.flightStatus = 'IN FLIGHT';
        s.missionStatus = 'SEARCHING SECTOR 7B';
        this.setAdvisory('nominal', 'CRUISE ALTITUDE REACHED:', 'Drone leveled at 48m AGL. Resuming autonomous lawnmower search grid.');
        opsManager.dispatchAlert('info', 'ALTITUDE REACHED [SIMULATION]', 'Previous: TAKING OFF ➔ New: IN FLIGHT. Target ceiling (48m) reached. Auto-grid active.');
      }
    } else if (s.flightStatus === 'HOLDING POSITION') {
      this.flightStep += 0.02 * mult;
      s.groundSpeed = 0.0;
      s.climbRate = 0.0;
      s.pitch = -2.0 + Math.sin(this.flightStep) * 0.5;
      s.roll = Math.cos(this.flightStep) * 0.5;
      STATE.motors.forEach((m, idx) => {
        m.rpm = 4400 + Math.round(Math.sin(this.flightStep * 2 + idx) * 40);
        m.fill = 65;
      });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.012 * mult);
        s.batteryVoltage = 20.6 + (s.batteryPercentage / 100) * 3.8;
      }
    } else if (s.flightStatus === 'RETURNING TO LAUNCH') {
      this.flightStep += 0.04 * mult;
      const dLat = s.homeLatitude - s.latitude;
      const dLon = s.homeLongitude - s.longitude;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      const targetHeading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
      s.heading = Math.round(targetHeading);
      s.groundSpeed = 15.2;
      s.climbRate = 0.0;
      s.pitch = -24.0;
      s.roll = 1.0;

      // Translate toward home waypoint
      if (dist > 0.0003) {
        const step = 0.00025 * mult;
        s.latitude += (dLat / dist) * step;
        s.longitude += (dLon / dist) * step;
      } else {
        // Arrived at home coordinates -> initiate autonomous landing
        s.latitude = s.homeLatitude;
        s.longitude = s.homeLongitude;
        s.flightStatus = 'LANDING';
        s.missionStatus = 'TOUCHDOWN AT LAUNCH PAD';
        this.setAdvisory('warning', 'TOUCHDOWN SEQUENCE:', 'Reached Home Launch Point. Autonomous descent initiated.');
        opsManager.dispatchAlert('warning', 'HOME REACHED [SIMULATION]', 'Previous: RETURNING TO LAUNCH ➔ New: LANDING. Initiating touchdown descent.');
      }

      STATE.motors.forEach((m, idx) => {
        m.rpm = 5100 + Math.round(Math.sin(this.flightStep * 2 + idx) * 60);
        m.fill = 78;
      });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.018 * mult);
        s.batteryVoltage = 20.4 + (s.batteryPercentage / 100) * 3.8;
      }
    } else if (s.flightStatus === 'LANDING') {
      s.climbRate = -2.6;
      s.altitude = Math.max(0.0, s.altitude + s.climbRate * mult);
      s.groundSpeed = Math.max(0.0, s.groundSpeed - 1.8 * mult);
      s.pitch = -4.0;
      s.roll = 0.2;
      STATE.motors.forEach((m, idx) => {
        m.rpm = 3800 + Math.round(Math.sin(idx) * 50);
        m.fill = 52;
      });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.015 * mult);
        s.batteryVoltage = 20.8 + (s.batteryPercentage / 100) * 3.8;
      }
      if (s.altitude <= 0.2) {
        s.altitude = 0.0;
        s.climbRate = 0.0;
        s.groundSpeed = 0.0;
        s.flightStatus = 'LANDED';
        s.missionStatus = 'TOUCHDOWN COMPLETE - ON GROUND';
        this.setAdvisory('success', 'TOUCHDOWN COMPLETE:', 'Drone safely landed at Launch Pad. Motors at idle. Ready for DISARM or TAKEOFF.');
        opsManager.dispatchAlert('info', 'TOUCHDOWN CONFIRMED [SIMULATION]', 'Previous: LANDING ➔ New: LANDED. Touchdown confirmed at launch coordinates.');
      }
    } else if (s.flightStatus === 'LANDED') {
      s.altitude = 0.0;
      s.climbRate = 0.0;
      s.groundSpeed = 0.0;
      s.pitch = 0.0;
      s.roll = 0.0;
      STATE.motors.forEach((m) => {
        m.rpm = s.isArmed ? 1200 : 0;
        m.fill = s.isArmed ? 15 : 0;
      });
      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.002 * mult);
        s.batteryVoltage = 21.0 + (s.batteryPercentage / 100) * 3.8;
      }
    } else {
      // Standard 'IN FLIGHT' search grid or direct dispatch navigation
      this.flightStep += 0.05 * mult;

      let targetLat = s.targetLatitude;
      let targetLon = s.targetLongitude;

      if (s.navigationMode === 'TARGET_DISPATCH' && s.customTarget) {
        targetLat = s.customTarget.lat;
        targetLon = s.customTarget.lon;
      } else {
        const curWp = SEARCH_GRID_WAYPOINTS[s.activeWaypointIndex];
        targetLat = curWp.lat;
        targetLon = curWp.lon;
        s.targetName = curWp.id;
        s.targetLatitude = curWp.lat;
        s.targetLongitude = curWp.lon;
      }

      // Compute precise spherical distance & bearing
      const distMeters = calcDistanceMeters(s.latitude, s.longitude, targetLat, targetLon);
      const bearing = calcBearingDegrees(s.latitude, s.longitude, targetLat, targetLon);

      s.distanceToTarget = distMeters;
      s.bearingToTarget = Math.round(bearing);
      s.heading = Math.round(bearing);

      // Check Waypoint Arrival
      if (s.navigationMode === 'TARGET_DISPATCH') {
        if (distMeters <= 20) {
          // Arrived at custom dispatch target!
          s.latitude = targetLat;
          s.longitude = targetLon;
          this.hold();
          s.missionStatus = `LOITERING OVER: ${s.customTarget.name}`;
          this.setAdvisory('warning', 'TARGET REACHED - LOITERING:', `Arrived at ${s.customTarget.name}. Autopilot hovering at 48m for visual inspection.`);
          opsManager.dispatchAlert('critical', 'TARGET REACHED [SIMULATION]', `Arrived at ${s.customTarget.name} (${targetLat.toFixed(4)}°N, ${targetLon.toFixed(4)}°W). Loitering in position.`);
          audioSynth.playTargetLock();
        } else {
          // Advance coordinates toward target
          const stepMeters = s.groundSpeed * mult;
          const ratio = Math.min(1.0, stepMeters / Math.max(1.0, distMeters));
          s.latitude += (targetLat - s.latitude) * ratio;
          s.longitude += (targetLon - s.longitude) * ratio;
        }
      } else {
        // Autonomous Search Grid (Matrix sweep or Waypoint navigation)
        if (s.searchExecutionState === 'RUNNING') {
          // Matrix search grid is active and navigated by tickSearchStep()
          this.updateSearchHUD();
        } else if (distMeters <= 25) {
          // Waypoint reached!
          const reachedWp = SEARCH_GRID_WAYPOINTS[s.activeWaypointIndex];
          s.latitude = targetLat;
          s.longitude = targetLon;

          // Advance to next waypoint
          s.activeWaypointIndex = (s.activeWaypointIndex + 1) % SEARCH_GRID_WAYPOINTS.length;
          const nextWp = SEARCH_GRID_WAYPOINTS[s.activeWaypointIndex];
          s.targetName = nextWp.id;
          s.targetLatitude = nextWp.lat;
          s.targetLongitude = nextWp.lon;
          s.missionProgress = Math.round(((s.activeWaypointIndex + 1) / SEARCH_GRID_WAYPOINTS.length) * 100);

          mapManager.updateWaypointHighlights(s.activeWaypointIndex);
          opsManager.dispatchAlert('info', `WAYPOINT ${reachedWp.id} REACHED [SIMULATION]`, `Sector 7B search leg complete. Turning heading towards ${nextWp.id} (${nextWp.type}).`);
          audioSynth.playBeep(980, 0.12, 'sine');
        } else {
          // Advance coordinates toward active waypoint
          const stepMeters = s.groundSpeed * mult;
          const ratio = Math.min(1.0, stepMeters / Math.max(1.0, distMeters));
          s.latitude += (targetLat - s.latitude) * ratio;
          s.longitude += (targetLon - s.longitude) * ratio;
        }
      }

      // Gentle atmospheric altitude oscillation
      s.altitude = 48.0 + Math.sin(this.flightStep * 0.5) * 0.8;
      s.climbRate = Math.cos(this.flightStep * 0.5) * 0.15;
      s.groundSpeed = 14.2 + Math.sin(this.flightStep * 0.8) * 0.4;
      s.pitch = -26.0 + Math.sin(this.flightStep * 1.5) * 0.8;
      s.roll = Math.cos(this.flightStep * 1.5) * 1.2;

      STATE.motors.forEach((m, idx) => {
        const variation = Math.sin(this.flightStep * 3 + idx) * 80;
        m.rpm = Math.round(4800 + variation);
        m.fill = Math.min(100, Math.max(20, Math.round((m.rpm / 6000) * 100)));
      });

      if (s.batteryPercentage > 5) {
        s.batteryPercentage -= (0.015 * mult);
        s.batteryVoltage = 20.0 + (s.batteryPercentage / 100) * 3.8;
      }
    }

    // GPS Satellites: stable mock satellite lock (17 to 19)
    const satDelta = Math.sin(this.flightStep * 0.2);
    s.gpsSatellites = 18 + (satDelta > 0.75 ? 1 : (satDelta < -0.75 ? -1 : 0));

    // Phase 2 - Step 3: Geofence Containment & Safety Interlock Check
    const launchDist = calcDistanceMeters(s.homeLatitude, s.homeLongitude, s.latitude, s.longitude);
    s.launchDistance = launchDist;
    s.geofenceClearance = Math.max(0, STATE.settings.geofenceRadius - launchDist);

    if (launchDist > STATE.settings.geofenceRadius) {
      if (!s.geofenceBreach) {
        s.geofenceBreach = true;
        this.hold();
        this.setAdvisory('danger', 'SAFETY GUARD: GEOFENCE BREACH', `Drone exceeded ${STATE.settings.geofenceRadius}m limit (${launchDist.toFixed(0)}m). Emergency loiter hold active.`);
        opsManager.dispatchAlert('critical', 'GEOFENCE BREACH [SIMULATION]', `Safety interlock: Drone exceeded perimeter (${launchDist.toFixed(0)}m). Autopilot engaged hold.`);
        audioSynth.playBeep(350, 0.35, 'sawtooth');
      }
    } else if (launchDist > STATE.settings.geofenceRadius * 0.9) {
      if (!s.geofenceWarning) {
        s.geofenceWarning = true;
        opsManager.dispatchAlert('warning', 'GEOFENCE PROXIMITY [SIMULATION]', `Drone within 10% of geofence perimeter (${launchDist.toFixed(0)}m / ${STATE.settings.geofenceRadius}m).`);
      }
    } else {
      s.geofenceBreach = false;
      s.geofenceWarning = false;
    }

    // 3. Update Dashboard Telemetry Cards and UI
    this.updateControlsUI();
    this.updateDashboardUI();
    this.updateWaypointHUD();

    // 4. Update Map Position
    mapManager.updateDronePosition(
      s.latitude,
      s.longitude,
      s.heading
    );
  }

  updateClock() {
    const now = new Date();
    const utcHours = String(now.getUTCHours()).padStart(2, '0');
    const utcMins = String(now.getUTCMinutes()).padStart(2, '0');
    const utcSecs = String(now.getUTCSeconds()).padStart(2, '0');
    if (DOM.liveClockUtc) {
      DOM.liveClockUtc.textContent = `${utcHours}:${utcMins}:${utcSecs} UTC`;
    }

    // Duration formatting
    const totalSecs = simulationState.flightDurationSeconds;
    const dHours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const dMins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const dSecs = String(totalSecs % 60).padStart(2, '0');
    const durStr = `${dHours}:${dMins}:${dSecs}`;

    if (DOM.flightDuration) {
      const statusLabel = simulationState.simulationEnabled ? 'SIMULATED' : 'PAUSED';
      DOM.flightDuration.textContent = `T+ ${durStr} ${statusLabel}`;
    }
    if (DOM.reportFlightTime) {
      DOM.reportFlightTime.textContent = durStr;
    }
  }

  /**
   * Synchronize UI controls (button state, simulation badge, flight deck controls)
   */
  updateControlsUI() {
    const isEnabled = simulationState.simulationEnabled;
    const s = simulationState;

    // Header toggle button
    if (DOM.btnToggleSimulation) {
      DOM.btnToggleSimulation.classList.toggle('is-paused', !isEnabled);
      if (DOM.simToggleText) {
        DOM.simToggleText.textContent = isEnabled ? 'PAUSE SIM' : 'START SIM';
      }
      if (DOM.simToggleIcon) {
        DOM.simToggleIcon.className = isEnabled ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
    }

    // Prominent Simulation Mode Badge
    if (DOM.simModeBadge) {
      DOM.simModeBadge.classList.toggle('paused', !isEnabled);
      if (DOM.simModeText) {
        DOM.simModeText.textContent = isEnabled ? 'SIMULATION MODE' : 'SIMULATION PAUSED';
      }
    }

    // Settings Master Checkbox
    if (DOM.checkSimulationEnabled) {
      DOM.checkSimulationEnabled.checked = isEnabled;
    }

    // Top status dot
    if (DOM.systemStatusDot) {
      DOM.systemStatusDot.className = isEnabled ? 'status-dot' : 'status-dot warning';
    }

    // Top flight mode badge
    if (DOM.flightModeBadge) {
      DOM.flightModeBadge.textContent = s.flightStatus;
    }

    // ========================================================================
    // Phase 2 - Step 2: Interactive Drone Flight Control Deck Sync
    // ========================================================================
    if (DOM.controlFlightStateText) {
      DOM.controlFlightStateText.textContent = s.flightStatus;
    }

    if (DOM.controlStateDot) {
      let dotClass = 'control-state-dot';
      if (!isEnabled || s.flightStatus === 'SIM PAUSED') dotClass += ' paused';
      else if (s.flightStatus === 'DISARMED') dotClass += ' disarmed';
      else if (s.flightStatus === 'ARMED') dotClass += ' armed';
      else if (s.flightStatus === 'TAKING OFF') dotClass += ' takingoff';
      else if (s.flightStatus === 'HOLDING POSITION') dotClass += ' holding';
      else if (s.flightStatus === 'RETURNING TO LAUNCH') dotClass += ' rtl';
      else if (s.flightStatus === 'LANDING') dotClass += ' landing';
      else if (s.flightStatus === 'LANDED') dotClass += ' landed';
      DOM.controlStateDot.className = dotClass;
    }

    // 1. Arm / Disarm Button
    if (DOM.btnControlArm) {
      if (DOM.textControlArm) {
        DOM.textControlArm.textContent = s.isArmed ? 'DISARM (SIM)' : 'ARM (SIM)';
      }
      if (DOM.descControlArm) {
        DOM.descControlArm.textContent = s.isArmed ? 'Motors Armed • Click to Disarm' : 'Motors Safe • Click to Arm';
      }
      if (DOM.badgeControlArm) {
        DOM.badgeControlArm.textContent = s.isArmed ? 'ARMED' : 'DISARMED';
        DOM.badgeControlArm.className = `action-status-pill ${s.isArmed ? 'armed' : 'disarmed'}`;
      }
      if (DOM.iconControlArm) {
        DOM.iconControlArm.style.color = s.isArmed ? 'var(--accent-amber)' : 'var(--text-muted)';
      }
      // Safety visual: cannot disarm while airborne
      DOM.btnControlArm.classList.toggle('is-disabled', s.isArmed && s.altitude > 1.0);
    }

    // 2. Takeoff Button
    if (DOM.btnControlTakeoff) {
      const canTakeoff = s.isArmed && s.altitude <= 1.0 && s.flightStatus !== 'TAKING OFF';
      DOM.btnControlTakeoff.classList.toggle('is-disabled', !canTakeoff);
      DOM.btnControlTakeoff.classList.toggle('is-active', s.flightStatus === 'TAKING OFF');
    }

    // 3. Hold Position Button
    if (DOM.btnControlHold) {
      const canHold = s.altitude > 0.2 && s.flightStatus !== 'LANDED' && s.flightStatus !== 'DISARMED';
      DOM.btnControlHold.classList.toggle('is-disabled', !canHold);
      DOM.btnControlHold.classList.toggle('is-active', s.flightStatus === 'HOLDING POSITION');
    }

    // 4. Land Button
    if (DOM.btnControlLand) {
      const canLand = s.altitude > 0.2 && s.flightStatus !== 'LANDED' && s.flightStatus !== 'DISARMED';
      DOM.btnControlLand.classList.toggle('is-disabled', !canLand);
      DOM.btnControlLand.classList.toggle('is-active', s.flightStatus === 'LANDING');
    }

    // 5. RTL Button
    if (DOM.btnControlRtl) {
      const canRtl = s.altitude > 0.2 && s.flightStatus !== 'LANDED' && s.flightStatus !== 'DISARMED';
      DOM.btnControlRtl.classList.toggle('is-disabled', !canRtl);
      DOM.btnControlRtl.classList.toggle('is-active', s.flightStatus === 'RETURNING TO LAUNCH');
    }

    // Safety Advisory Bar Sync
    if (DOM.controlSafetyAdvisory && s.advisoryMsg) {
      DOM.controlSafetyAdvisory.className = `safety-advisory-bar ${s.advisoryType || 'nominal'}`;
      if (DOM.advisoryMessage) DOM.advisoryMessage.textContent = s.advisoryMsg;
    }

    // ========================================================================
    // Phase 2 - Step 3: Tactical Mission Map & Search Grid Sync
    // ========================================================================
    if (DOM.btnStartAutoGrid) {
      const isAutoGrid = s.navigationMode === 'AUTO_GRID' && s.flightStatus === 'IN FLIGHT';
      DOM.btnStartAutoGrid.classList.toggle('active', isAutoGrid);
      if (DOM.textAutoGrid) {
        DOM.textAutoGrid.textContent = isAutoGrid ? 'Auto-Grid Active' : 'Auto-Grid Paused';
      }
      if (DOM.iconAutoGrid) {
        DOM.iconAutoGrid.className = isAutoGrid ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
    }

    if (DOM.btnToggleGridOverlay) {
      DOM.btnToggleGridOverlay.classList.toggle('active', s.showSearchGrid);
      const span = DOM.btnToggleGridOverlay.querySelector('span');
      if (span) span.textContent = s.showSearchGrid ? 'Search Grid [ON]' : 'Search Grid [OFF]';
    }

    if (DOM.btnToggleDashGrid) {
      DOM.btnToggleDashGrid.classList.toggle('active', s.showSearchGrid);
    }

    if (DOM.btnToggleDashTrail) {
      DOM.btnToggleDashTrail.classList.toggle('active', s.showBreadcrumbs);
    }
  }

  /**
   * Connect and update all 8 dashboard telemetry cards from simulationState
   */
  updateDashboardUI() {
    const s = simulationState;

    // Header Pills
    if (DOM.topLinkQuality) DOM.topLinkQuality.textContent = `${s.rfLink.toFixed(1)}%`;
    if (DOM.topLatency) DOM.topLatency.textContent = `${s.latency}ms`;

    // 1. Flight Status Card
    if (DOM.cardDroneStatus) DOM.cardDroneStatus.textContent = s.flightStatus;
    if (DOM.cardFlightState) {
      if (s.flightStatus === 'DISARMED') DOM.cardFlightState.textContent = 'DISARMED (SIM)';
      else if (s.flightStatus === 'ARMED') DOM.cardFlightState.textContent = 'ARMED (SIM)';
      else if (s.flightStatus === 'SIM PAUSED') DOM.cardFlightState.textContent = 'PAUSED (SIM)';
      else DOM.cardFlightState.textContent = 'ARMED (SIM)';
    }
    if (DOM.cardSimActiveStatus) {
      if (!s.simulationEnabled || s.flightStatus === 'SIM PAUSED') {
        DOM.cardSimActiveStatus.textContent = '● SIM PAUSED';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-amber)';
      } else if (s.flightStatus === 'DISARMED') {
        DOM.cardSimActiveStatus.textContent = '● MOTORS IDLE';
        DOM.cardSimActiveStatus.style.color = 'var(--text-muted)';
      } else if (s.flightStatus === 'HOLDING POSITION') {
        DOM.cardSimActiveStatus.textContent = '● LOITERING';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-purple)';
      } else if (s.flightStatus === 'RETURNING TO LAUNCH') {
        DOM.cardSimActiveStatus.textContent = '● RTL ACTIVE';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-rose)';
      } else if (s.flightStatus === 'LANDING') {
        DOM.cardSimActiveStatus.textContent = '● DESCENDING';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-amber)';
      } else if (s.flightStatus === 'LANDED') {
        DOM.cardSimActiveStatus.textContent = '● TOUCHDOWN';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-emerald)';
      } else {
        DOM.cardSimActiveStatus.textContent = '● SIM ACTIVE';
        DOM.cardSimActiveStatus.style.color = 'var(--accent-emerald)';
      }
    }
    if (DOM.cardFlightStatusBar) {
      if (!s.simulationEnabled || s.flightStatus === 'SIM PAUSED') {
        DOM.cardFlightStatusBar.style.width = '25%';
        DOM.cardFlightStatusBar.style.background = 'var(--accent-amber)';
      } else if (s.flightStatus === 'DISARMED') {
        DOM.cardFlightStatusBar.style.width = '10%';
        DOM.cardFlightStatusBar.style.background = 'var(--text-muted)';
      } else if (s.flightStatus === 'RETURNING TO LAUNCH') {
        DOM.cardFlightStatusBar.style.width = '90%';
        DOM.cardFlightStatusBar.style.background = 'var(--accent-rose)';
      } else if (s.flightStatus === 'HOLDING POSITION') {
        DOM.cardFlightStatusBar.style.width = '75%';
        DOM.cardFlightStatusBar.style.background = 'var(--accent-purple)';
      } else {
        DOM.cardFlightStatusBar.style.width = '100%';
        DOM.cardFlightStatusBar.style.background = 'var(--accent-emerald)';
      }
    }

    // 2. Battery Card
    const battRounded = Math.round(s.batteryPercentage);
    if (DOM.cardBatteryPercent) DOM.cardBatteryPercent.textContent = battRounded;
    if (DOM.cardBatteryVolts) DOM.cardBatteryVolts.textContent = `${s.batteryVoltage.toFixed(1)}V (6S LiPo)`;
    if (DOM.cardBatteryBar) DOM.cardBatteryBar.style.width = `${s.batteryPercentage}%`;
    const minsRem = Math.round((s.batteryPercentage / 100) * 24);
    if (DOM.cardBatteryRemaining) DOM.cardBatteryRemaining.textContent = `~${minsRem} min rem`;

    // 3. GPS Position & Satellites Card
    if (DOM.cardGpsLat) DOM.cardGpsLat.textContent = `${s.latitude.toFixed(4)}° N`;
    if (DOM.cardGpsLon) DOM.cardGpsLon.textContent = `${Math.abs(s.longitude).toFixed(4)}° W`;
    if (DOM.cardGpsSats) DOM.cardGpsSats.textContent = `${s.gpsSatellites} Sats (3D)`;

    // 4. Altitude Card (AGL & MSL)
    if (DOM.cardAltitude) DOM.cardAltitude.textContent = s.altitude.toFixed(1);
    if (DOM.cardAltitudeBar) DOM.cardAltitudeBar.style.width = `${Math.min(100, (s.altitude / 100) * 100)}%`;
    if (DOM.cardClimbRate) DOM.cardClimbRate.textContent = `${s.climbRate >= 0 ? '+' : ''}${s.climbRate.toFixed(1)} m/s`;
    if (DOM.cardAltitudeMsl) DOM.cardAltitudeMsl.textContent = `${Math.round(s.altitude + 104)}m MSL`;

    // 5. Ground Speed & Heading Card
    if (DOM.cardSpeed) DOM.cardSpeed.textContent = s.groundSpeed.toFixed(1);
    const kmh = (s.groundSpeed * 3.6).toFixed(1);
    if (DOM.cardSpeedKmh) DOM.cardSpeedKmh.textContent = `${kmh} km/h`;
    if (DOM.cardSpeedBar) DOM.cardSpeedBar.style.width = `${Math.min(100, (s.groundSpeed / 25) * 100)}%`;
    if (DOM.cardHeadingVal) DOM.cardHeadingVal.textContent = `${Math.round(s.heading)}° WNW`;

    // 6. Persons Detected Card
    if (DOM.cardPersonCount) DOM.cardPersonCount.textContent = s.detectedPersonCount;
    if (DOM.cardPersonAlert) DOM.cardPersonAlert.textContent = s.detectedPersonCount > 0 ? '1 SOS Urgent' : '0 Urgent';
    if (DOM.cardPersonSub) DOM.cardPersonSub.textContent = `${Math.max(0, s.detectedPersonCount - 1)} Monitored`;

    // 7. AI Confidence & Camera Mode Card
    if (DOM.cardAiConfidence) DOM.cardAiConfidence.textContent = '94.8';
    if (DOM.cardCameraMode) {
      DOM.cardCameraMode.textContent = s.cameraMode.toUpperCase() + (s.cameraMode === 'rgb' ? ' DAYLIGHT' : '');
    }

    // 8. Mission Status & Progress Card
    if (DOM.cardMissionProgress) DOM.cardMissionProgress.textContent = s.missionProgress;
    if (DOM.cardMissionBar) DOM.cardMissionBar.style.width = `${s.missionProgress}%`;
    if (DOM.cardMissionStatusText) DOM.cardMissionStatusText.textContent = s.missionStatus;

    // HUD Stamps
    if (DOM.hudPitch) DOM.hudPitch.textContent = `${s.pitch.toFixed(1)}°`;
    if (DOM.hudRoll) DOM.hudRoll.textContent = `${s.roll >= 0 ? '+' : ''}${s.roll.toFixed(1)}°`;
    if (DOM.hudBearing) DOM.hudBearing.textContent = `${Math.round(s.heading)}° WNW`;
    if (DOM.hudGps) DOM.hudGps.textContent = `${s.latitude.toFixed(4)}°N, ${Math.abs(s.longitude).toFixed(4)}°W`;
    if (DOM.hudAlt) DOM.hudAlt.textContent = `${Math.round(s.altitude)}m`;

    // Telemetry Deck Elements
    if (DOM.horizonLine) {
      DOM.horizonLine.style.transform = `rotate(${-s.roll}deg) translateY(${s.pitch * 1.5}px)`;
    }
    if (DOM.telemetryPitch) DOM.telemetryPitch.textContent = `${s.pitch.toFixed(1)}°`;
    if (DOM.telemetryRoll) DOM.telemetryRoll.textContent = `${s.roll >= 0 ? '+' : ''}${s.roll.toFixed(1)}°`;
    if (DOM.telemetryYaw) DOM.telemetryYaw.textContent = `${Math.round(s.heading)}°`;

    // Motor RPMs
    STATE.motors.forEach((m, i) => {
      if (DOM.motorFills[i]) DOM.motorFills[i].style.height = `${m.fill}%`;
      if (DOM.motorRpms[i]) DOM.motorRpms[i].textContent = `${m.rpm.toLocaleString()} RPM`;
    });
  }
}

const simEngine = new SimulationEngine();

// ============================================================================
// Detection & Alert Management
// ============================================================================
class OperationsManager {
  renderDetections() {
    if (!DOM.detectionList) return;
    DOM.detectionList.innerHTML = '';

    let criticalCount = 0;
    const threshold = STATE.camera.confidenceThreshold !== undefined ? STATE.camera.confidenceThreshold : 0.50;
    const visibleDetections = STATE.detections.filter((d) => d.confidence >= threshold);

    visibleDetections.forEach((target) => {
      if (target.triage === 'critical') criticalCount++;

      const confPercent = Math.round(target.confidence * 100);
      const isSelected = target.id === STATE.camera.selectedTargetId;
      const isLocked = target.id === STATE.camera.lockedTargetId;

      const card = document.createElement('div');
      card.className = `detection-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
      card.setAttribute('data-target-id', target.id);

      let triageBadgeClass = 'triage-emerald';
      if (target.triage === 'critical') triageBadgeClass = 'triage-red';
      else if (target.triage === 'amber') triageBadgeClass = 'triage-amber';

      const lockBadge = isLocked ? `<span class="gimbal-lock-badge"><i class="fa-solid fa-lock"></i> LOCKED</span>` : '';

      card.innerHTML = `
        <div class="detection-card-header">
          <span class="target-id">
            <i class="fa-solid fa-person-burst" style="color: var(--accent-cyan);"></i>
            ${target.id}
            ${lockBadge}
          </span>
          <span class="triage-badge ${triageBadgeClass}">${target.triage.toUpperCase()}</span>
        </div>

        <div class="detection-details">
          <span>LAT: ${target.lat.toFixed(4)}°</span>
          <span>LON: ${target.lon.toFixed(4)}°</span>
          <span>TEMP: <b style="color: var(--accent-amber);">${target.thermalTemp}</b></span>
          <span>TIME: ${target.timestamp}</span>
        </div>

        <div class="confidence-row">
          <div class="confidence-label-wrap">
            <span style="color: var(--text-muted);">AI CONFIDENCE</span>
            <span style="color: var(--accent-cyan); font-weight: 700;">${confPercent}%</span>
          </div>
          <div class="confidence-bar-bg">
            <div class="confidence-bar-fill" style="width: ${confPercent}%;"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        audioSynth.playTargetLock();
        this.selectTarget(target.id);
        if (mapManager.dashboardMap) {
          mapManager.dashboardMap.setView([target.lat, target.lon], 16);
        }
      });

      DOM.detectionList.appendChild(card);
    });

    // Update Counter Cards
    if (DOM.cardPersonCount) DOM.cardPersonCount.textContent = visibleDetections.length;
    if (DOM.reportVictimCount) DOM.reportVictimCount.textContent = STATE.detections.length;
    if (DOM.sidebarBadgeCount) DOM.sidebarBadgeCount.textContent = visibleDetections.length;
    if (DOM.badgeHighRiskCount) DOM.badgeHighRiskCount.textContent = `${criticalCount} CRITICAL`;
    if (DOM.theaterTargetCount) DOM.theaterTargetCount.textContent = `${visibleDetections.length} DETECTED`;

    // Render Sub-components
    this.renderHistoryTable();
    this.renderTargetInspector();
    this.renderTargetQuickSelector();
  }

  selectTarget(targetId) {
    STATE.camera.selectedTargetId = targetId;

    // Update detection cards active state in DOM without full rebuild if present
    const cards = document.querySelectorAll('.detection-card');
    cards.forEach((c) => {
      const id = c.getAttribute('data-target-id');
      c.classList.toggle('selected', id === targetId);
    });

    this.renderTargetInspector();
    this.renderTargetQuickSelector();
    audioSynth.playTargetLock();
  }

  renderTargetInspector() {
    const targetId = STATE.camera.selectedTargetId || (STATE.detections[0] ? STATE.detections[0].id : null);
    const target = STATE.detections.find((t) => t.id === targetId);

    if (!target) {
      if (DOM.inspectorTargetId) DOM.inspectorTargetId.textContent = 'NO TARGET SELECTED';
      return;
    }

    if (DOM.inspectorTargetId) DOM.inspectorTargetId.textContent = target.id;

    if (DOM.inspectorTriagePill) {
      DOM.inspectorTriagePill.textContent = target.triage.toUpperCase();
      DOM.inspectorTriagePill.className = `triage-badge ${
        target.triage === 'critical' ? 'triage-red' : target.triage === 'amber' ? 'triage-amber' : 'triage-emerald'
      }`;
    }

    if (DOM.inspectorThermalVal) {
      DOM.inspectorThermalVal.textContent = target.thermalTemp;
    }

    if (DOM.inspectorConfVal) {
      DOM.inspectorConfVal.textContent = `${(target.confidence * 100).toFixed(1)}% (YOLOv8)`;
    }

    if (DOM.inspectorCoordsVal) {
      DOM.inspectorCoordsVal.textContent = `${target.lat.toFixed(4)}°N, ${target.lon.toFixed(4)}°W`;
    }

    if (DOM.inspectorDistVal) {
      const dist = calcDistanceMeters(
        simulationState.latitude,
        simulationState.longitude,
        target.lat,
        target.lon
      );
      const bearing = calcBearingDegrees(
        simulationState.latitude,
        simulationState.longitude,
        target.lat,
        target.lon
      );
      DOM.inspectorDistVal.textContent = `${Math.round(dist)}m (${Math.round(bearing)}°)`;
    }

    if (DOM.inspectorStatusVal) {
      DOM.inspectorStatusVal.textContent = target.status;
      if (target.status.includes('Confirmed')) {
        DOM.inspectorStatusVal.style.color = 'var(--accent-emerald)';
      } else {
        DOM.inspectorStatusVal.style.color = 'var(--accent-amber)';
      }
    }

    if (DOM.inspectorTimeVal) {
      DOM.inspectorTimeVal.textContent = target.timestamp;
    }

    // Gimbal Lock Button State
    const isLocked = STATE.camera.lockedTargetId === target.id;
    if (DOM.btnLockTarget) {
      DOM.btnLockTarget.classList.toggle('active', isLocked);
      if (DOM.textLockTarget) {
        DOM.textLockTarget.textContent = isLocked ? 'Release Gimbal Lock (Sim)' : 'Engage Gimbal Lock (Sim)';
      }
      if (DOM.iconLockTarget) {
        DOM.iconLockTarget.className = isLocked ? 'fa-solid fa-lock-open' : 'fa-solid fa-crosshairs';
      }
    }

    // Gimbal Lock HUD indicator over the theater canvas
    if (DOM.gimbalLockHud) {
      if (STATE.camera.lockedTargetId) {
        DOM.gimbalLockHud.style.display = 'inline-flex';
        if (DOM.gimbalLockText) {
          DOM.gimbalLockText.textContent = `GIMBAL LOCKED: ${STATE.camera.lockedTargetId}`;
        }
      } else {
        DOM.gimbalLockHud.style.display = 'none';
      }
    }

    // Theater Tracking Text
    if (DOM.theaterTrackingText) {
      if (STATE.camera.lockedTargetId) {
        DOM.theaterTrackingText.textContent = `TRACKING: ${STATE.camera.lockedTargetId} (OPTICAL/THERMAL GIMBAL LOCK)`;
      } else if (target) {
        DOM.theaterTrackingText.textContent = `INSPECTING: ${target.id} (READY FOR GIMBAL LOCK)`;
      } else {
        DOM.theaterTrackingText.textContent = 'TRACKING: SCANNING SECTOR 7B';
      }
    }

    // Triage Verification Button State
    const isVerified = target.status.includes('Confirmed');
    if (DOM.btnVerifyTriage) {
      DOM.btnVerifyTriage.classList.toggle('active', isVerified);
      if (DOM.textVerifyTriage) {
        DOM.textVerifyTriage.textContent = isVerified ? 'Casualty Confirmed (Sim)' : 'Verify Triage (Sim)';
      }
      if (DOM.iconVerifyTriage) {
        DOM.iconVerifyTriage.className = isVerified ? 'fa-solid fa-check-double' : 'fa-solid fa-user-check';
      }
    }
  }

  renderTargetQuickSelector() {
    if (!DOM.targetQuickSelector) return;
    DOM.targetQuickSelector.innerHTML = '';

    STATE.detections.forEach((target) => {
      const isSelected = target.id === STATE.camera.selectedTargetId;
      const isLocked = target.id === STATE.camera.lockedTargetId;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `quick-target-pill ${isSelected ? 'active' : ''} ${target.triage === 'critical' ? 'critical' : ''}`;
      
      let lockIcon = isLocked ? '<i class="fa-solid fa-lock" style="color: var(--accent-amber); margin-right: 4px;"></i>' : '';
      btn.innerHTML = `${lockIcon}${target.id} (${Math.round(target.confidence * 100)}%)`;

      btn.addEventListener('click', () => {
        this.selectTarget(target.id);
      });

      DOM.targetQuickSelector.appendChild(btn);
    });
  }

  toggleGimbalLock(targetId) {
    const id = targetId || STATE.camera.selectedTargetId || (STATE.detections[0] ? STATE.detections[0].id : null);
    if (!id) return;

    if (STATE.camera.lockedTargetId === id) {
      STATE.camera.lockedTargetId = null;
      this.dispatchAlert('info', 'GIMBAL LOCK RELEASED [SIMULATION]', `Optical/thermal gimbal returned to autonomous search sweep.`);
      audioSynth.playBeep(520, 0.1, 'sine');
    } else {
      STATE.camera.lockedTargetId = id;
      const t = STATE.detections.find((d) => d.id === id);
      const coords = t ? ` (${t.lat.toFixed(4)}°N, ${t.lon.toFixed(4)}°W)` : '';
      this.dispatchAlert('warning', 'GIMBAL LOCKED ON TARGET [SIMULATION]', `Camera gimbal servo locked on ${id}${coords}. Auto-tracking active.`);
      audioSynth.playBeep(980, 0.2, 'sine');
    }

    this.renderDetections();
  }

  verifyTriage(targetId) {
    const id = targetId || STATE.camera.selectedTargetId || (STATE.detections[0] ? STATE.detections[0].id : null);
    const target = STATE.detections.find((d) => d.id === id);
    if (!target) return;

    if (!target.status.includes('Confirmed')) {
      target.savedStatus = target.status;
      target.status = 'Confirmed SAR Casualty';
      target.triage = 'critical';
      this.dispatchAlert(
        'critical',
        'TRIAGE CONFIRMED [SIMULATION]',
        `${target.id} verified as Confirmed SAR Casualty (${target.thermalTemp}). Rescue dispatch priority elevated.`
      );
      audioSynth.playBeep(880, 0.15, 'triangle');
    } else {
      target.status = target.savedStatus || 'Active (Unverified)';
      this.dispatchAlert('info', 'TRIAGE STATUS RESET [SIMULATION]', `${target.id} triage status reset to ${target.status}.`);
      audioSynth.playBeep(600, 0.1, 'sine');
    }

    this.renderDetections();
    mapManager.renderVictimMarkers();
  }

  dispatchToSelectedTarget() {
    const targetId = STATE.camera.selectedTargetId || (STATE.detections[0] ? STATE.detections[0].id : null);
    const target = STATE.detections.find((d) => d.id === targetId);
    if (!target) {
      this.dispatchAlert('warning', 'DISPATCH FAILED [SIMULATION]', 'No active detection selected to command drone autopilot.');
      return;
    }

    const success = simEngine.dispatchToTarget(target.id, target.lat, target.lon);
    if (success) {
      this.dispatchAlert(
        'critical',
        'AUTOPILOT DISPATCHED TO AI TARGET [SIMULATION]',
        `Drone rerouted to investigate ${target.id} at ${target.lat.toFixed(4)}°N, ${target.lon.toFixed(4)}°W.`
      );
    }
  }

  renderHistoryTable() {
    if (!DOM.historyTableBody) return;
    DOM.historyTableBody.innerHTML = '';

    STATE.detections.forEach((target) => {
      const tr = document.createElement('tr');
      const confPercent = (target.confidence * 100).toFixed(1);

      let triageBadgeClass = 'triage-emerald';
      if (target.triage === 'critical') triageBadgeClass = 'triage-red';
      else if (target.triage === 'amber') triageBadgeClass = 'triage-amber';

      tr.innerHTML = `
        <td><b>${target.id}</b></td>
        <td>${target.timestamp}</td>
        <td>${target.lat.toFixed(4)}° N</td>
        <td>${target.lon.toFixed(4)}° W</td>
        <td><span style="color: var(--accent-cyan); font-weight: 700;">${confPercent}%</span></td>
        <td><span class="triage-badge ${triageBadgeClass}">${target.triage.toUpperCase()}</span></td>
        <td><span style="color: var(--accent-amber);">${target.thermalTemp}</span></td>
        <td>${target.status}</td>
      `;
      DOM.historyTableBody.appendChild(tr);
    });
  }

  renderAlerts() {
    if (!DOM.alertStream) return;
    DOM.alertStream.innerHTML = '';

    STATE.alerts.forEach((alert) => {
      const item = document.createElement('div');
      item.className = `alert-item ${alert.type}`;
      item.innerHTML = `
        <div class="alert-meta">
          <span><b>${alert.title}</b></span>
          <span>${alert.time}</span>
        </div>
        <div class="alert-text">${alert.msg}</div>
      `;
      DOM.alertStream.appendChild(item);
    });
  }

  dispatchAlert(type, title, msg) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newAlert = {
      id: Date.now(),
      type: type,
      title: title,
      msg: msg,
      time: timeStr
    };

    STATE.alerts.unshift(newAlert);
    if (STATE.alerts.length > 25) STATE.alerts.pop();

    this.renderAlerts();

    // Pulse system dot if critical
    if (type === 'critical' && DOM.systemStatusDot) {
      DOM.systemStatusDot.className = 'status-dot danger';
      setTimeout(() => {
        if (DOM.systemStatusDot) DOM.systemStatusDot.className = 'status-dot';
      }, 5000);
    }
  }

  simulateNewDetection() {
    const nextNum = STATE.detections.length + 1;
    const targetId = `TARGET-0${nextNum}`;
    const latOffset = (Math.random() - 0.5) * 0.008;
    const lonOffset = (Math.random() - 0.5) * 0.008;
    const conf = 0.88 + Math.random() * 0.09;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newTarget = {
      id: targetId,
      lat: STATE.telemetry.lat + latOffset,
      lon: STATE.telemetry.lon + lonOffset,
      confidence: conf,
      triage: Math.random() > 0.5 ? 'critical' : 'amber',
      label: `Person #${nextNum} (Simulated)`,
      thermalTemp: `${(36.5 + Math.random() * 0.8).toFixed(1)}°C`,
      timestamp: timeStr,
      status: 'Active (Unverified)',
      canvasX: 120 + Math.random() * 400,
      canvasY: 100 + Math.random() * 220
    };

    STATE.detections.push(newTarget);
    simulationState.detectedPersonCount = STATE.detections.length;
    STATE.camera.selectedTargetId = targetId;

    // Audio beep
    audioSynth.playTargetLock();

    // Dispatch incident alert
    this.dispatchAlert(
      'critical',
      `NEW HUMAN DETECTED // ${targetId}`,
      `AI identified thermal signature at Sector 7B (${newTarget.lat.toFixed(4)}°N, ${newTarget.lon.toFixed(4)}°W). Confidence: ${(conf * 100).toFixed(1)}%.`
    );

    // Refresh views & maps
    this.renderDetections();
    mapManager.renderVictimMarkers();
  }

  simulateRTL() {
    STATE.telemetry.status = 'RETURNING (RTL)';
    STATE.telemetry.flightMode = 'RETURN TO LAUNCH';
    if (DOM.flightModeBadge) DOM.flightModeBadge.textContent = 'RTL EMERGENCY';
    if (DOM.flightModeBadge) DOM.flightModeBadge.style.color = 'var(--accent-rose)';

    audioSynth.playBeep(440, 0.3, 'sawtooth');
    this.dispatchAlert(
      'warning',
      'RTL PROTOCOL ENGAGED',
      'Return-to-Launch command sent. Drone returning autonomously to home landing coordinates (34.2500°N, -118.1580°W).'
    );
  }

  exportCsv() {
    let csv = 'Target ID,Timestamp,Latitude,Longitude,Confidence,Triage,Thermal Temp,Status\n';
    STATE.detections.forEach((d) => {
      csv += `${d.id},${d.timestamp},${d.lat.toFixed(6)},${d.lon.toFixed(6)},${(d.confidence * 100).toFixed(1)}%,${d.triage},${d.thermalTemp},"${d.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyresq-incident-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportKml() {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>SkyResQ Tactical Mission Flight Path (Simulated)</name>
    <description>Simulated autonomous search grid flight path and waypoints generated by SkyResQ Tactical Mission System</description>
    <Style id="flightLine">
      <LineStyle>
        <color>ffffff00</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Folder>
      <name>Search Grid Waypoints</name>`;

    SEARCH_GRID_WAYPOINTS.forEach((wp) => {
      kml += `
      <Placemark>
        <name>${wp.id} - ${wp.name}</name>
        <description>Alt: ${wp.alt}m AGL | Sector 7B Lawnmower Leg</description>
        <Point>
          <coordinates>${wp.lng},${wp.lat},${wp.alt}</coordinates>
        </Point>
      </Placemark>`;
    });

    kml += `
    </Folder>
    <Placemark>
      <name>Simulated Drone Track</name>
      <styleUrl>#flightLine</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>`;

    if (mapManager && mapManager.breadcrumbTrail && mapManager.breadcrumbTrail.length > 0) {
      mapManager.breadcrumbTrail.forEach((pt) => {
        kml += `\n          ${pt[1]},${pt[0]},48`;
      });
    } else {
      SEARCH_GRID_WAYPOINTS.forEach((wp) => {
        kml += `\n          ${wp.lng},${wp.lat},${wp.alt}`;
      });
    }

    kml += `
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyresq-flightpath-${Date.now()}.kml`;
    a.click();
    URL.revokeObjectURL(url);

    this.dispatchAlert('info', 'FLIGHT PATH EXPORTED (SIM)', 'Simulated tactical flight path and waypoint sequence downloaded as KML.');
  }
}

const opsManager = new OperationsManager();

// ============================================================================
// View Navigation & Event Listeners
// ============================================================================
function initNavigation() {
  DOM.navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const viewTarget = link.getAttribute('data-view');
      if (!viewTarget) return;

      // Update sidebar links
      DOM.navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      // Switch active view container
      DOM.views.forEach((v) => {
        v.classList.remove('active');
        if (v.id === `view${capitalize(viewTarget)}` || v.id === `view${toCamelCase(viewTarget)}`) {
          v.classList.add('active');
        }
      });

      STATE.activeView = viewTarget;

      // Leaflet map refresh when switching tabs
      mapManager.invalidateSizes();

      // Trigger canvas resize
      if (primaryCamera) primaryCamera.resize();
      if (theaterCamera) theaterCamera.resize();
    });
  });
}

function initEventHandlers() {
  // Vision Mode Switcher (RGB / FLIR Thermal / Night Vision)
  DOM.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      DOM.modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-mode') || btn.getAttribute('data-theater-mode') || 'rgb';
      STATE.camera.visionMode = mode;
      simEngine.updateDashboardUI();
      audioSynth.playBeep(640, 0.08, 'sine');
    });
  });

  // Phase 2 - Step 1: Simulation Toggle Button (Header)
  if (DOM.btnToggleSimulation) {
    DOM.btnToggleSimulation.addEventListener('click', () => {
      simEngine.toggle();
    });
  }

  // Phase 2 - Step 1: Simulation Master Toggle Checkbox (Settings Panel)
  if (DOM.checkSimulationEnabled) {
    DOM.checkSimulationEnabled.addEventListener('change', (e) => {
      if (e.target.checked) {
        simEngine.start();
        opsManager.dispatchAlert('info', 'SIMULATION RESUMED', 'Master simulation engine active.');
      } else {
        simEngine.stop();
        opsManager.dispatchAlert('warning', 'SIMULATION PAUSED', 'Master simulation engine disabled.');
      }
    });
  }

  // Toggle AI Bounding Boxes
  if (DOM.btnToggleBoxes) {
    DOM.btnToggleBoxes.addEventListener('click', () => {
      STATE.camera.showBoundingBoxes = !STATE.camera.showBoundingBoxes;
      DOM.btnToggleBoxes.classList.toggle('btn-cyan', STATE.camera.showBoundingBoxes);
      audioSynth.playBeep(720, 0.06, 'sine');
    });
  }

  // Toggle Thermal Boost
  if (DOM.btnToggleThermalNoise) {
    DOM.btnToggleThermalNoise.addEventListener('click', () => {
      STATE.camera.thermalBoost = !STATE.camera.thermalBoost;
      DOM.btnToggleThermalNoise.classList.toggle('btn-cyan', STATE.camera.thermalBoost);
      audioSynth.playBeep(800, 0.06, 'sine');
    });
  }

  // Simulated Snapshot
  if (DOM.btnSnapshot) {
    DOM.btnSnapshot.addEventListener('click', () => {
      audioSynth.playBeep(1100, 0.1, 'sine');
      opsManager.dispatchAlert('info', 'SNAPSHOT CAPTURED', 'High-res frame archived to mission storage (SIM).');
      alert('Simulated Snapshot: Frame successfully tagged with GPS telemetry and archived to mission record.');
    });
  }

  // Trigger New Simulated Victim Button
  if (DOM.btnTriggerDetection) {
    DOM.btnTriggerDetection.addEventListener('click', () => {
      opsManager.simulateNewDetection();
    });
  }

  // Header Tactical RTL Button (Synced with Flight Controller)
  if (DOM.btnRTL) {
    DOM.btnRTL.addEventListener('click', () => {
      simEngine.rtl();
    });
  }

  // ==========================================================================
  // Phase 2 - Step 2: Interactive Drone Flight Control Deck Event Listeners
  // ==========================================================================
  if (DOM.btnControlArm) {
    DOM.btnControlArm.addEventListener('click', () => {
      simEngine.toggleArm();
    });
  }

  if (DOM.btnControlTakeoff) {
    DOM.btnControlTakeoff.addEventListener('click', () => {
      simEngine.takeoff();
    });
  }

  if (DOM.btnControlHold) {
    DOM.btnControlHold.addEventListener('click', () => {
      simEngine.hold();
    });
  }

  if (DOM.btnControlLand) {
    DOM.btnControlLand.addEventListener('click', () => {
      simEngine.land();
    });
  }

  if (DOM.btnControlRtl) {
    DOM.btnControlRtl.addEventListener('click', () => {
      simEngine.rtl();
    });
  }

  // Center Drone on Map
  const btnCenterDrone = document.getElementById('btnCenterDrone');
  if (btnCenterDrone) {
    btnCenterDrone.addEventListener('click', () => mapManager.centerDrone());
  }

  // Fit Geofence on Map
  const btnFitGeofence = document.getElementById('btnFitGeofence');
  if (btnFitGeofence) {
    btnFitGeofence.addEventListener('click', () => mapManager.fitGeofence());
  }

  // Clear Alerts
  if (DOM.btnClearAlerts) {
    DOM.btnClearAlerts.addEventListener('click', () => {
      STATE.alerts = [];
      opsManager.renderAlerts();
    });
  }

  // CSV Export
  if (DOM.btnExportCsv) {
    DOM.btnExportCsv.addEventListener('click', () => opsManager.exportCsv());
  }

  // Phase 2 - Step 3: Tactical Mission Map Controls
  if (DOM.btnToggleDashGrid) {
    DOM.btnToggleDashGrid.addEventListener('click', () => {
      mapManager.toggleSearchGrid();
    });
  }

  if (DOM.btnToggleDashTrail) {
    DOM.btnToggleDashTrail.addEventListener('click', () => {
      mapManager.toggleBreadcrumbs();
    });
  }

  if (DOM.btnToggleGridOverlay) {
    DOM.btnToggleGridOverlay.addEventListener('click', () => {
      mapManager.toggleSearchGrid();
    });
  }

  if (DOM.btnStartAutoGrid) {
    DOM.btnStartAutoGrid.addEventListener('click', () => {
      simEngine.toggleAutoGrid();
    });
  }

  if (DOM.btnResetWaypoints) {
    DOM.btnResetWaypoints.addEventListener('click', () => {
      simEngine.resetWaypoints();
    });
  }

  if (DOM.btnClearBreadcrumbs) {
    DOM.btnClearBreadcrumbs.addEventListener('click', () => {
      mapManager.clearBreadcrumbs();
    });
  }

  if (DOM.btnCenterMapDrone) {
    DOM.btnCenterMapDrone.addEventListener('click', () => {
      mapManager.centerDrone();
    });
  }

  if (DOM.btnResumeGrid) {
    DOM.btnResumeGrid.addEventListener('click', () => {
      simEngine.resumeSearchGrid();
    });
  }

  // Phase 2 - Step 3: Autonomous Search Grid Matrix Controls
  if (DOM.selectGridSize) {
    DOM.selectGridSize.addEventListener('change', (e) => {
      const size = parseInt(e.target.value, 10);
      simulationState.gridSize = size;
      simEngine.stopAutonomousSearch();
      mapManager.buildTacticalGrid(size);
      opsManager.dispatchAlert('info', 'GRID SIZE UPDATED [SIMULATION]', `Sector 7B matrix configured to ${size}x${size} (${size * size} cells).`);
    });
  }

  if (DOM.selectSearchPattern) {
    DOM.selectSearchPattern.addEventListener('change', (e) => {
      const pattern = e.target.value;
      simulationState.searchPattern = pattern;
      mapManager.computeTraversalSequence(pattern, simulationState.gridSize);
      opsManager.dispatchAlert('info', 'SEARCH PATTERN UPDATED [SIMULATION]', `Autonomous search trajectory set to ${pattern.toUpperCase()}.`);
    });
  }

  if (DOM.selectSearchSpeed) {
    DOM.selectSearchSpeed.addEventListener('change', (e) => {
      simulationState.searchSpeed = e.target.value;
      if (simulationState.searchExecutionState === 'RUNNING') {
        simEngine.startAutonomousSearch();
      }
      simEngine.updateSearchHUD();
      opsManager.dispatchAlert('info', 'SEARCH SPEED UPDATED [SIMULATION]', `Cell scan rate adjusted to ${e.target.value.toUpperCase()}.`);
    });
  }

  if (DOM.btnStartSearch) {
    DOM.btnStartSearch.addEventListener('click', () => {
      simEngine.startAutonomousSearch();
    });
  }

  if (DOM.btnPauseSearch) {
    DOM.btnPauseSearch.addEventListener('click', () => {
      simEngine.pauseAutonomousSearch();
    });
  }

  if (DOM.btnResumeSearch) {
    DOM.btnResumeSearch.addEventListener('click', () => {
      simEngine.resumeAutonomousSearch();
    });
  }

  if (DOM.btnStopSearch) {
    DOM.btnStopSearch.addEventListener('click', () => {
      simEngine.stopAutonomousSearch();
    });
  }

  if (DOM.btnResetGrid) {
    DOM.btnResetGrid.addEventListener('click', () => {
      simEngine.resetAutonomousSearch();
    });
  }

  // Download Flight Path (Simulated KML)
  if (DOM.btnDownloadFlightPath) {
    DOM.btnDownloadFlightPath.addEventListener('click', () => {
      opsManager.exportKml();
    });
  }

  // PDF Report Mock
  if (DOM.btnGenerateReport) {
    DOM.btnGenerateReport.addEventListener('click', () => {
      window.print();
    });
  }

  // Simulation Speed Slider/Select
  if (DOM.simSpeedSelect) {
    DOM.simSpeedSelect.addEventListener('change', (e) => {
      STATE.settings.simSpeed = parseInt(e.target.value, 10);
    });
  }

  // Audio Toggle
  if (DOM.checkAudioSim) {
    DOM.checkAudioSim.addEventListener('change', (e) => {
      STATE.settings.audioSim = e.target.checked;
    });
  }

  // Geofence Radius Slider
  if (DOM.geofenceRadiusSlider) {
    DOM.geofenceRadiusSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      STATE.settings.geofenceRadius = val;
      if (DOM.geofenceRadiusVal) DOM.geofenceRadiusVal.textContent = `${val.toLocaleString()}m`;
      if (mapManager.geofenceCircle) mapManager.geofenceCircle.setRadius(val);
      if (mapManager.fullGeofenceCircle) mapManager.fullGeofenceCircle.setRadius(val);
    });
  }

  // Confidence Threshold (Step 4: AI Inference Sensitivity)
  if (DOM.confThresholdSlider) {
    DOM.confThresholdSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      STATE.camera.confidenceThreshold = val / 100;
      if (DOM.confThresholdVal) DOM.confThresholdVal.textContent = `${val}%`;
      if (DOM.theaterAnalyticsText) {
        DOM.theaterAnalyticsText.textContent = `YOLOv8-SAR • THRESHOLD: ${val}%`;
      }
      opsManager.renderDetections();
    });
  }

  // Show Labels Toggle
  if (DOM.checkShowLabels) {
    DOM.checkShowLabels.addEventListener('change', (e) => {
      STATE.camera.showLabels = e.target.checked;
    });
  }

  // Thermal Heat Smoothing Toggle
  if (DOM.checkHeatSmoothing) {
    DOM.checkHeatSmoothing.addEventListener('change', (e) => {
      STATE.camera.thermalSmoothing = e.target.checked;
    });
  }

  // Phase 2 - Step 4: Detection Studio Action Buttons
  if (DOM.btnLockTarget) {
    DOM.btnLockTarget.addEventListener('click', () => {
      opsManager.toggleGimbalLock();
    });
  }

  if (DOM.btnVerifyTriage) {
    DOM.btnVerifyTriage.addEventListener('click', () => {
      opsManager.verifyTriage();
    });
  }

  if (DOM.btnDispatchToDetectedTarget) {
    DOM.btnDispatchToDetectedTarget.addEventListener('click', () => {
      opsManager.dispatchToSelectedTarget();
    });
  }

  const btnSimulateVictim = document.getElementById('btnSimulateVictim');
  if (btnSimulateVictim) {
    btnSimulateVictim.addEventListener('click', () => {
      opsManager.simulateNewDetection();
    });
  }

  // Reset Simulation
  if (DOM.btnResetSimulation) {
    DOM.btnResetSimulation.addEventListener('click', () => {
      simulationState.batteryPercentage = 100.0;
      simulationState.batteryVoltage = 25.2;
      simulationState.flightDurationSeconds = 0;
      simulationState.flightStatus = 'IN FLIGHT';
      simulationState.simulationEnabled = true;
      simEngine.flightStep = 0;
      simEngine.resetWaypoints();
      simEngine.start();
      opsManager.dispatchAlert('info', 'SIMULATION RESTARTED', 'All parameters re-initialized to mission start values.');
    });
  }
}

// Utility Helpers
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/^./, (g) => g.toUpperCase());
}

// ============================================================================
// Initialization Entrypoint
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  console.log('SkyResQ Dashboard Initializing (Simulation Prototype)...');

  // 1. Navigation & Interactions
  initNavigation();
  initEventHandlers();

  // 2. Camera Viewports
  if (DOM.cameraCanvas) {
    primaryCamera = new CameraFeedRenderer(DOM.cameraCanvas);
    primaryCamera.start();
  }
  if (DOM.theaterCanvas) {
    theaterCamera = new CameraFeedRenderer(DOM.theaterCanvas);
    theaterCamera.start();
  }

  // 3. Leaflet Interactive Maps
  mapManager.init();

  // 4. Initial Renders
  opsManager.renderDetections();
  opsManager.renderAlerts();
  opsManager.renderTargetInspector();
  opsManager.renderTargetQuickSelector();
  simEngine.renderWaypointTable();
  simEngine.updateWaypointHUD();
  simEngine.updateSearchHUD();

  // 5. Start Telemetry Physics Simulation
  simEngine.start();
});

// Expose state and engine for browser developer console inspection and testing
window.simulationState = simulationState;
window.simEngine = simEngine;
window.mapManager = mapManager;
window.SEARCH_GRID_WAYPOINTS = SEARCH_GRID_WAYPOINTS;
window.STATE = STATE;
window.opsManager = opsManager;
