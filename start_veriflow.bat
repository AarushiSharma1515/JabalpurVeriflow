@echo off
echo ========================================
echo    VeriFlow Hackathon Startup Script
echo ========================================
echo.

:: Auto-detect current WiFi IP
echo Detecting your current IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set RAW_IP=%%a
    goto :found_ip
)

:found_ip
:: Remove leading space from IP
set SERVER_IP=%RAW_IP: =%
echo Detected IP: %SERVER_IP%
echo.

:: Update app .env with current IP
echo Updating app .env...
echo EXPO_PUBLIC_SERVER_IP=%SERVER_IP%> "C:\Users\Dell\Documents\veriflow_hackathon\veriflow_app\.env"
echo EXPO_PUBLIC_SERVER_PORT=5001>> "C:\Users\Dell\Documents\veriflow_hackathon\veriflow_app\.env"
echo App .env updated!
echo.

:: Start Terminal 1 - Backend
echo Starting Backend on port 5001...
start "VeriFlow Backend" cmd /k "cd /d C:\Users\Dell\Documents\veriflow_hackathon\backend && node index.js"
timeout /t 4 /nobreak > nul

:: Start Terminal 2 - ML Service with correct venv
echo Starting ML Service on port 8000...
start "VeriFlow ML" cmd /k "C:\Users\Dell\Documents\SIH_VERIFLOW-final\ml_service\venv\Scripts\activate && cd /d C:\Users\Dell\Documents\veriflow_hackathon\ml_service && python -m uvicorn app:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak > nul

:: Start Terminal 3 - Expo App
echo Starting Expo App...
start "VeriFlow App" cmd /k "cd /d C:\Users\Dell\Documents\veriflow_hackathon\veriflow_app && npx expo start"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo Backend:  http://%SERVER_IP%:5001
echo ML Model: http://%SERVER_IP%:8000
echo App:      Scan QR code in Expo terminal
echo ========================================
echo.
pause
