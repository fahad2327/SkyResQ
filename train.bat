@echo off
title SkyResQ YOLO Model Trainer
cd /d "%~dp0"

echo =====================================================================
echo                   SKYRESQ YOLO MODEL TRAINING SUITE
echo =====================================================================
echo.
echo Choose an option:
echo [1] Auto-train Fan ^& Smart Phone model (10 epochs)
echo [2] Capture real photos of your room FAN using your Webcam
echo [3] Capture real photos of your SMART PHONE using your Webcam
echo [4] Custom train with existing dataset (15 epochs)
echo [5] Exit
echo.
set /p opt="Enter choice [1-5]: "

if "%opt%"=="1" (
    echo.
    echo [*] Generating dataset and fine-tuning YOLOv8...
    backend\.venv\Scripts\python.exe train_yolo.py --auto --epochs 10 --batch 8
    goto done
)
if "%opt%"=="2" (
    echo.
    echo [*] Opening webcam collector for 'fan'...
    backend\.venv\Scripts\python.exe train_yolo.py --collect-webcam --class-name fan --count 20
    goto done
)
if "%opt%"=="3" (
    echo.
    echo [*] Opening webcam collector for 'smart phone'...
    backend\.venv\Scripts\python.exe train_yolo.py --collect-webcam --class-name "smart phone" --count 20
    goto done
)
if "%opt%"=="4" (
    echo.
    echo [*] Training YOLOv8 for 15 epochs...
    backend\.venv\Scripts\python.exe train_yolo.py --train --epochs 15 --batch 8
    goto done
)
if "%opt%"=="5" (
    exit /b 0
)

:done
echo.
echo =====================================================================
echo [*] Done! The trained weights are saved in: ai\models\yolov8_custom.pt
echo [*] The SkyResQ live server will automatically detect and load them.
echo =====================================================================
pause
