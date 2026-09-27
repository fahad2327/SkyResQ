@echo off
setlocal enabledelayedexpansion
title SkyResQ Aerial Rescue - System Launcher

echo ======================================================================
echo           SKYRESQ INDEPENDENT - SEARCH ^& RESCUE SYSTEM
echo           Multi-Device Network ^& Autonomous Mission Launcher
echo ======================================================================
echo.

:: Detect Python Virtual Environment
set PYTHON_EXE=python
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
    echo [*] Found virtual environment: backend\.venv
) else if exist "%~dp0.venv312\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv312\Scripts\python.exe"
    echo [*] Found virtual environment: .venv312
) else (
    echo [*] Using system Python
)

:: Retrieve local IPv4 address
echo [*] Detecting Local Wi-Fi / LAN IP Address...
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "@((Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual).IPAddress)[0]"') do (
    set LOCAL_IP=%%i
)

if "%LOCAL_IP%"=="" (
    set LOCAL_IP=127.0.0.1
)

echo.
echo ======================================================================
echo   SKYRESQ IS ACCESSIBLE FROM ANY DEVICE ON YOUR WI-FI NETWORK:
echo.
echo   [PC / Host Device]:
echo     Dashboard:  http://localhost:8080
echo     API Docs:   http://localhost:8000/docs
echo.
echo   [Mobile Phones, Tablets, Reconnaissance Nodes]:
echo     Dashboard:   http://!LOCAL_IP!:8080
echo     Mobile Cam:  http://!LOCAL_IP!:8080/mobile-cam.html
echo     API Docs:    http://!LOCAL_IP!:8000/docs
echo ======================================================================

echo.
echo [*] Starting FastAPI Backend on 0.0.0.0:8000...
cd /d "%~dp0backend"
start "SkyResQ Backend Service" cmd /k ""%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [*] Starting Frontend HTTP Server on 0.0.0.0:8080...
cd /d "%~dp0frontend"
start "SkyResQ Frontend Static Server" cmd /k ""%PYTHON_EXE%" -m http.server 8080 --bind 0.0.0.0"

cd /d "%~dp0"

echo [*] Launching SkyResQ Mission Control in your default browser...
ping -n 3 127.0.0.1 >nul
start http://localhost:8080

echo.
echo [!] Both servers are running in separate terminal windows.
echo [!] Keep this window open or press any key to exit launcher.
pause >nul

