# SkyResQ Independent &bull; Multi-Device Access & Field Operation Guide

This guide explains how to connect smartphones, tablets, handheld ground control stations, and secondary laptops to your host PC running SkyResQ over your local Wi-Fi or hotspot network.

---

## 1. Quick Start (One-Click Launch)

Double-click `start_servers.bat` in the project root directory.

The launcher will:
1. Detect your local network IPv4 address (e.g. `192.168.1.105`).
2. Bind the **FastAPI Backend** to `0.0.0.0:8000` (accessible from any device).
3. Bind the **Tactical Frontend Server** to `0.0.0.0:8080` (accessible from any device).
4. Automatically open `http://localhost:8080` on your host PC.
5. Print the exact mobile URL to enter on your phone or tablet.

---

## 2. Accessing From Other Devices on the Same Wi-Fi

### Step 1: Ensure Devices Are on the Same Network
Make sure your smartphone, tablet, or secondary laptop is connected to the **same Wi-Fi network** or **mobile hotspot** as your host computer.

### Step 2: Find the Host PC's IP Address
If you did not run `start_servers.bat`, you can find your IP manually:
1. Open PowerShell or Command Prompt on your host PC.
2. Run:
   ```powershell
   ipconfig
   ```
3. Look for **IPv4 Address** under your active Wi-Fi adapter (for example: `192.168.1.45`).

### Step 3: Open the Dashboard on Your Phone or Tablet
Open any modern mobile browser (Google Chrome, Safari, Firefox, Edge) on your mobile device and navigate to:
```
http://<YOUR-HOST-IP>:8080
```
*(Example: `http://192.168.1.45:8080`)*

The SkyResQ dynamic API client (`frontend/js/api.js`) automatically detects `window.location.hostname` and connects seamlessly to `http://192.168.1.45:8000`.

---

## 3. Using Mobile Sensors in the Field

### A. Real Device GPS Sync (Outdoor Ground Tracking)
When walking outdoors with your mobile phone or tablet:
1. In the header bar or the **Drone Connector Modal**, tap **"Real Device GPS"** or the **"REAL GPS: OFF"** button.
2. When prompted by your mobile browser, tap **"Allow Location Access"**.
3. SkyResQ will lock onto your phone's physical satellite GPS coordinates.
4. The tactical Leaflet map will automatically center on your exact location, and all live YOLO target detections will be tagged with your precise latitude and longitude.

> **Tip for Mobile Browsers:** Modern mobile browsers restrict HTML5 Geolocation on plain `http://` unless it is `localhost` or explicitly allowed. To enable GPS over LAN on Chrome Android:
> 1. In Chrome on your phone, visit: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
> 2. Enter: `http://<YOUR-HOST-IP>:8080`
> 3. Set to **Enabled** and tap **Relaunch**.

### B. Smartphone Camera Optical Feed
When using your phone as an optical payload camera:
1. Tap the **Laptop / Mobile Camera** tab in the sidebar navigation.
2. Tap **Start Laptop Camera** (or select the rear/front sensor from the Camera Selector dropdown).
3. Allow camera permissions when prompted.
4. The neural YOLO model on your host PC will run inference on the camera feed in real time, displaying bounding boxes around people and hazards.

---

## 4. Hardware Drone Connector Options

In the **Drone Connector Station** (accessible via the satellite dish icon in the header):
1. **Procedural Simulation (Default)**:
   - Full simulated flight physics in Sector 7B with realistic battery discharge, IMU vibration, and GPS drift.
2. **Real Device GPS Direct**:
   - Links the drone avatar directly to your physical phone/laptop movements.
3. **MAVLink Serial (USB COM Port)**:
   - Connects to hardware flight controllers (Pixhawk, ArduPilot, PX4, or SiK 433/915MHz telemetry radio dongles) on your host PC at `COM3` / `COM4` (Baud: 57600 or 115200).
4. **MAVLink UDP Bridge (Network)**:
   - Connects to drone telemetry streams routed via Wi-Fi, 4G/LTE companion computers (Raspberry Pi), or QGroundControl / Mission Planner on port `14550`.

---

## 5. Network Troubleshooting & Windows Firewall

If your phone displays *"Site can't be reached"* when navigating to `http://<HOST-IP>:8080`:

1. **Check Windows Defender Firewall**:
   - Open PowerShell as Administrator on your PC and allow incoming connections on ports 8000 and 8080:
     ```powershell
     New-NetFirewallRule -DisplayName "SkyResQ Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
     New-NetFirewallRule -DisplayName "SkyResQ Frontend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
     ```
2. **Check Wi-Fi Network Profile**:
   - In Windows Settings > Network & Internet > Wi-Fi, ensure your network profile is set to **Private network** (public networks block local device communication).
3. **Verify Host Backend Status**:
   - On your host PC, open `http://localhost:8000/api/v1/health` in your browser. You should receive `{"status": "ok"}`.
