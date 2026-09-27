# SkyResQ Backend Service

Modular FastAPI backend service for **SkyResQ_Independent — AI-Powered Aerial Rescue & Situational Awareness System**.

---

## Architecture Overview

```text
backend/
├── __init__.py
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── system.py
│   │       ├── drone.py
│   │       ├── mission.py
│   │       ├── detection.py
│   │       └── media.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── system.py
│   │   ├── drone.py
│   │   ├── mission.py
│   │   ├── detection.py
│   │   └── media.py
│   └── core/
│       ├── __init__.py
│       └── config.py
├── requirements.txt
└── README.md
```

### Module Responsibilities

* **`app/core/config.py`**: Centralized configuration management (project name, API prefixes, data mode).
* **`app/schemas/`**: Pydantic models validating request and response payloads.
* **`app/api/routes/`**: Modular sub-routers handling specific domain endpoints (`system`, `drone`, `mission`, `detection`, `media`).
* **`app/main.py`**: Application factory, CORS middleware, global health checks, and route aggregation.

---

## Endpoints

### 1. General Endpoints
* **`GET /`**: Identifies the running backend service.
* **`GET /health`**: Health check returning operational status and mode.

### 2. System API
* **`GET /api/v1/system/info`**: Returns service metadata, version, environment, and simulation data mode.

```json
{
  "service": "skyresq-backend",
  "version": "0.1.0",
  "environment": "development",
  "data_mode": "simulation"
}
```

### 3. Drone Status API
* **`GET /api/v1/drone/status`**: Returns clearly labelled simulated drone telemetry and navigation state.

```json
{
  "drone_id": "SIM-DRONE-001",
  "connection_status": "simulated",
  "armed": false,
  "flight_mode": "STANDBY",
  "battery_percentage": 85,
  "voltage": 15.2,
  "latitude": 13.0827,
  "longitude": 80.2707,
  "altitude_meters": 0.0,
  "speed_meters_per_second": 0.0,
  "heading_degrees": 0.0,
  "satellites": 12
}
```

### 4. Mission API
* **`GET /api/v1/mission/current`**: Returns current active/standby simulated mission information.

```json
{
  "mission_id": "SIM-MISSION-001",
  "status": "not_started",
  "data_mode": "simulation",
  "target_area": "Development Test Area"
}
```

### 5. Detection API
* **`GET /api/v1/detection/summary`**: Returns simulated detection metrics and count summaries.

```json
{
  "data_mode": "simulation",
  "victims_detected": 0,
  "hazards_detected": 0,
  "last_detection_time": null
}
```

### 6. Media API
* **`GET /api/v1/media/status`**: Returns camera connection states and video stream statuses.

```json
{
  "rgb_camera": "not_connected",
  "thermal_camera": "not_connected",
  "stream_status": "not_available",
  "data_mode": "simulation"
}
```

### 7. Interactive API Documentation
* **Swagger UI**: `http://127.0.0.1:8000/docs`
* **ReDoc Specification**: `http://127.0.0.1:8000/redoc`

---

## Running the Backend Using `.venv312`

The backend runs using the **Python 3.12** virtual environment (`.venv312`) located in the project root.

### Starting the Server from the Project Root

Open PowerShell in the project root (`c:\Users\FAHAD\Resque Drone`):

```powershell
# Start Uvicorn development server with hot-reload on port 8000
& ".\.venv312\Scripts\uvicorn.exe" app.main:app --reload --port 8000
```

Alternatively, you can run:

```powershell
& ".\.venv312\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
```

### Verifying Endpoints in PowerShell

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/system/info"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/drone/status"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/mission/current"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/detection/summary"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/media/status"
```
