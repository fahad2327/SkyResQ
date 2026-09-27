# SkyResQ — AI-Powered Aerial Rescue & Situational Awareness System

SkyResQ is an aerial situational awareness and search-and-rescue (SAR) mission management platform designed to accelerate casualty localization and emergency response through autonomous flight telemetry, real-time computer vision (YOLOv8), and tactical GIS mapping.

---

## 🚀 Key Features

* **Real-Time Drone Telemetry & Connector**:
  * Multi-protocol link support: **Procedural Simulation**, **Real Device GPS Sync**, **MAVLink Serial (COM port / Pixhawk)**, and **MAVLink UDP Bridge (14550)**.
  * Live avionics: 3D GPS coordinates, barometric altitude, ground speed, battery health & voltage, artificial horizon heading, and satellite count.
  * Flight modes (LOITER, AUTO, RTL, GUIDED, LAND) and software motor arming/disarming controls.

* **Tactical Leaflet GPS Mission Map**:
  * Dark Matter GIS map with heading-synchronized SVG drone icon and real-time flight trail breadcrumbs.
  * Interactive radar casualty pins: automatically drops pulsating sonar markers when people or hazards are localized.
  * Autonomous search grid generator: **Lawnmower serpentine grid**, **Expanding rectangular spiral**, and **Sector sweep patterns**.

* **Laptop & Mobile Camera Optical Station (Live YOLOv8)**:
  * In-browser live camera stream (`navigator.mediaDevices.getUserMedia`) with tactical HUD corner reticles.
  * Continuous debounced frame inference with neural YOLOv8: renders real-time bounding boxes, class labels, and confidence tags.
  * Instant casualty localization: detected victims trigger audible visual flashes and log geographic coordinates directly onto the mission map.

* **Dedicated Neural Detection Station**:
  * Drag-and-drop aerial SAR image ingestion with tunable confidence threshold slider (5% to 95%).
  * High-resolution annotated image viewport with detected targets breakdown and historical run log.

* **Incident Debriefing & Multi-Format Export**:
  * Complete SAR debriefing log tracking localized casualties, mission duration, and distance swept.
  * One-click **JSON Mission Log** export, **CSV Target Detections** export, and clean **Printable Incident Brief**.

* **Multi-Device & Cross-Platform Operation**:
  * Built to run locally or over Wi-Fi on smartphones, tablets, and secondary laptops with responsive dark glassmorphic styling.

---

## ⚡ Quick Start (One-Click Launch)

Double-click `start_servers.bat` in the project root:
```powershell
.\start_servers.bat
```
This automatically starts both the FastAPI backend on port `8000` and the frontend server on port `8080`, detects your local Wi-Fi IP address, and opens the dashboard in your default browser at:
* **Host PC**: [http://localhost:8080](http://localhost:8080)
* **Mobile / Other Devices**: `http://<YOUR-WIFI-IP>:8080` (printed in terminal)
* **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

For comprehensive instructions on connecting phones and tablets, see [Multi-Device Field Setup Guide](docs/MULTI_DEVICE_SETUP.md).

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/drone/status` | Complete avionics status (coordinates, altitude, battery, arming, protocol) |
| `POST` | `/api/v1/drone/connect` | Connect drone via SIMULATION, DEVICE_GPS_SYNC, MAVLINK_SERIAL, or MAVLINK_UDP |
| `POST` | `/api/v1/drone/disconnect` | Disengage active telemetry link |
| `POST` | `/api/v1/drone/arm` | Arm or disarm drone motors |
| `POST` | `/api/v1/drone/mode` | Set flight mode (LOITER, AUTO, RTL, GUIDED, LAND, MANUAL) |
| `POST` | `/api/v1/drone/telemetry/override` | Inject real device GPS coordinates and telemetry |
| `POST` | `/api/v1/detection/detect` | Upload image/frame for YOLO neural inference with georeferencing |
| `GET` | `/api/v1/detection/health` | Check YOLO neural engine status and active weights |
| `GET` | `/api/v1/detection/history` | Retrieve past detection runs with annotated image URLs |
| `GET` | `/api/v1/system/dashboard` | Aggregated dashboard telemetry snapshot in a single request |

---

## 📚 Documentation

* [Multi-Device Access Guide](docs/MULTI_DEVICE_SETUP.md)
* [System Architecture](docs/ARCHITECTURE.md)
* [AI Integration Guide](docs/AI_INTEGRATION.md)
* [Backend Service Guide](backend/README.md)
