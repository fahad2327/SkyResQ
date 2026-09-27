# 🚁 SkyResQ - Autonomous Aerial Search & Rescue Mission Control
### National Disaster Response Force (NDRF) - Deployment & Operations Manual

---

## 📑 Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Quick-Start: Local Command Station Launch](#quick-start-local-command-station-launch)
3. [Docker Containerized Deployment](#docker-containerized-deployment)
4. [Cloud Deployment (Render / Railway / Cloud VM)](#cloud-deployment-render--railway--cloud-vm)
5. [Security & Operator Authentication Configuration](#5-security--operator-authentication-configuration)
6. [Tactical System Operations & Verification Flow](#6-tactical-system-operations--verification-flow)
7. [Mission Dossier Extraction & Documentation](#7-mission-dossier-extraction--documentation)

---

## 1. Overview & Architecture

SkyResQ is a national-grade Autonomous Aerial Search & Rescue (SAR) and Disaster Management Command & Control (C2) platform engineered for rapid disaster reconnaissance and casualty localization.

- **Frontend**: Defense-grade tactical glassmorphism UI, Leaflet.js real-time GPS tracking, Web Audio tactical sound synthesizers, live YOLOv8 canvas bounding-box HUD, interactive Emblem Manager, and formal Government of India / NDRF Mission Dossier generator.
- **Backend**: High-throughput FastAPI asynchronous REST API, SQLite WAL persistence engine, and multi-node camera feed router.
- **AI Vision Engine**: Ultralytics YOLOv8 real-time neural object detector identifying survivors, casualties, flood hazards, fire, and vehicles.
- **Multi-Node Networking**: Cross-device Wi-Fi/LAN synchronization enabling field responders on smartphones (`/mobile-cam.html`) to relay live video and GPS directly to the incident command center.

## 2. Quick-Start: Local Command Station Launch

To start both the FastAPI backend and Mission Control dashboard on Windows:

1. Double-click **`start_servers.bat`** in the project root.
2. The launcher will automatically:
   - Detect Python virtual environments (`backend\.venv` or `.venv312`)
   - Detect your local Wi-Fi / LAN IP address (e.g. `10.217.159.171`)
   - Launch the FastAPI Backend on `0.0.0.0:8000`
   - Launch the Mission Control Web Portal on `0.0.0.0:8080`
   - Automatically open `http://localhost:8080` in your default browser.

### Access URLs
- **Mission Control (PC / Host)**: `http://localhost:8080`
- **FastAPI Interactive Docs**: `http://localhost:8000/docs`
- **Mobile Tactical Camera Node**: `http://<YOUR_LAN_IP>:8080/mobile-cam.html`

---

## 3. Docker Containerized Deployment

Deploy SkyResQ as a unified single-container application anywhere Docker is installed (Linux, macOS, Windows Server):

```bash
# Build and run with Docker Compose
docker compose up --build -d

# Check running status
docker compose ps

# View live application logs
docker compose logs -f
```

The unified container runs on port `8000`:
- **Dashboard**: `http://localhost:8000/`
- **Swagger Docs**: `http://localhost:8000/docs`
- **Mobile Camera**: `http://localhost:8000/mobile-cam.html`

To stop:
```bash
docker compose down
```

---

## 4. Production Cloud Deployment: Frontend on Vercel & Backend on Render

SkyResQ is architected for split cloud deployment:
- **Backend (FastAPI + YOLOv8 + SQLite)** deployed on **Render** (Free / Starter Tier)
- **Frontend (Mission Control HUD + Mobile Cam)** deployed on **Vercel** (Global Edge CDN)

---

### Step 1: Deploy Backend to Render

You can deploy the backend using either **Render Blueprints (1-Click)** or as a **Standard Web Service**:

#### Method A: Automated via Render Blueprint (`render.yaml`)
1. Push your repository to **GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render reads `render.yaml` automatically and configures:
   - **Runtime**: Python 3.11.9
   - **Build Command**: `pip install --upgrade pip && pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
6. Click **Apply**.
7. Once deployed, note down your backend URL (e.g., `https://skyresq-backend.onrender.com`).

#### Method B: Manual Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repo.
3. Configure the settings:
   - **Name**: `skyresq-backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   - `PYTHONPATH`: `.`
   - `SKYRESQ_ENV`: `production`
5. Click **Deploy Web Service**.

> **Note on Cold Starts**: Render's free tier spins down web services after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to warm up.

---

### Step 2: Deploy Frontend to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name**: `skyresq-frontend` (or your choice)
   - **Framework Preset**: `Other`
   - **Root Directory**: Click *Edit* and select `frontend` (or leave as root `./` — both are pre-configured with `vercel.json`!)
   - **Build and Output Settings**: Leave defaults (no build command needed for pure HTML/JS)
5. Click **Deploy**.
6. Within seconds, Vercel will provide your live URL (e.g. `https://skyresq-frontend.vercel.app`).

---

### Step 3: Connect Frontend to Backend

You have 3 easy ways to link your Vercel frontend to your Render backend:

1. **Live in the Browser (No redeployment needed!)**:
   - Open your deployed Vercel site (`https://your-frontend.vercel.app`).
   - If the backend is disconnected, an alert banner will display: **"FastAPI backend unavailable"**.
   - Click **"Set Backend URL"** (or click **"Change URL"** in the footer).
   - Enter your Render URL: `https://your-backend.onrender.com`
   - Click **OK**. The frontend connects instantly and saves the URL in `localStorage` for all future visits!

2. **Via Config File**:
   - In `frontend/js/config.js`, set:
     ```javascript
     window.__SKYRESQ_CONFIG__ = {
       BACKEND_URL: "https://your-backend.onrender.com",
       ...
     };
     ```
   - Commit and push to GitHub — Vercel will automatically redeploy.

3. **Via URL Query Parameter**:
   - Share a pre-configured link with team members:
     `https://your-frontend.vercel.app/?api=https://your-backend.onrender.com`

---

## 5. Security & Operator Authentication Configuration

SkyResQ implements a multi-tier defense authentication and authorization pipeline:
1. **Registered Operator Database**: Thread-safe SQLite database (`backend/data/skyresq.db`) with `users` and `otps` tables.
2. **Default Registered Operator Credentials**:
   - Master Pilot: `pilot@skyresq.org` | Password: `skyresq` | Callsign: `PILOT-ALPHA`
   - Command Lead: `h.fahad2301@gmail.com` | Password: `skyresq` | Callsign: `COMMAND-LEAD`
   - Routine operator login requires ONLY valid username/email and registered password.
3. **Real-Time Dynamic OTP (Registration & Account Recovery)**:
   - Dynamic cryptographically generated 4-digit verification codes valid for 5 minutes.
   - Operators can toggle delivery between **Registered Email** or **Tactical SMS**.
   - If SMTP credentials are configured, the backend automatically sends a real-time email dispatch via TLS.
   - In offline field conditions or local evaluations, the code is also securely displayed via dynamic tactical HUD feedback with a 1-click Auto-Fill button.
4. **Forgot Password Recovery**:
   - Operators can click "Forgot Passcode? Recover" in the Login Gateway.
   - A verification code is dispatched to the operator's registered email ID.
   - Upon confirming the 4-digit code and typing the new password, the credential is automatically updated in the database.
5. **SMTP Environment Variables (Optional for Live Production Email)**:
   ```env
   SKYRESQ_SMTP_HOST=smtp.gmail.com
   SKYRESQ_SMTP_PORT=587
   SKYRESQ_SMTP_USER=your_command_email@gmail.com
   SKYRESQ_SMTP_PASS=your_app_password
   ```

---

## 6. Tactical System Operations & Verification Flow

Follow this sequence to operate SkyResQ's full capabilities:

1. **Tactical Boot Sequence**:
   - Open `http://localhost:8080`.
   - Experience the high-tech boot sequence with rotating radar sweep, sonar pulses, NavIC satellite lock simulation, and tactical audio chirps.
2. **Routine Operator Login**:
   - Enter `pilot@skyresq.org` and password `skyresq`.
   - Routine sign-in enters directly without requiring an OTP.
3. **Esri Dark Gray GPS Tile Layer**:
   - Switch between **Satellite**, **Terrain**, and **Tactical Dark** GPS modes.
   - The Dark Mode uses high-contrast Esri World Dark Gray tiles with zero API key errors or watermarks.
4. **Multi-Sensor Camera Station**:
   - When a drone is connected, the drone's 4K aerial camera footage streams directly in the Camera tab with live terrain, HUD, and YOLO bounding boxes.
   - In the Thermal IR tab, FLIR radiometric thermal heat signatures are rendered.
   - When no drone is connected, operators can use the Laptop Camera or Mobile Phone Camera for standalone YOLO target recognition.
   - All localized casualties and hazards from every camera source are recorded in the tactical map pins, live targets table, and debrief report.
5. **Official Mission Dossier Document**:
   - Click "SAR Dossier (PDF)" to view the formal incident report document with casualty coordinates and debrief logs ready to print.

---

## 7. Mission Dossier Extraction & Documentation

To export formal documentation for NDRF / District Administration / Defense Command:

1. Navigate to the **Mission Telemetry & Reports** section or click **Generate Official SAR Dossier**.
2. The modal displays:
   - Official Government of India / NDRF header & classified watermark stamps
   - Document ID & timestamp tracking
   - Total Survivor & Hazard counts
   - Exact 6-decimal GPS Coordinates manifest table (Latitude, Longitude, Target Type, Confidence)
   - Visual photographic evidence cards with bounding boxes
3. Export options:
   - **Print / Save as PDF**: Formatted with high-contrast monochrome letterhead ready for print.
   - **Export Word (.DOC)**: Generates an editable Microsoft Word document for official incident debriefs.
