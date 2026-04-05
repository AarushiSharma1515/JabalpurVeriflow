@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   VeriFlow - One Click Launcher
echo ========================================

:: Kill anything already on these ports
echo [CLEANUP] Freeing ports 5001, 8000, 8081...

for %%P in (5001 8000 8081) do (
    for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        echo   Killing PID %%I on port %%P
        taskkill /PID %%I /F > nul 2>&1
    )
)

timeout /t 2 /nobreak > nul
echo [OK] Ports cleared.

:: Resolve project root from where this .bat lives
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

echo [OK] Root: %ROOT%

:: Verify folders exist
if not exist "%ROOT%\backend" (
    echo [ERROR] Cannot find: %ROOT%\backend
    pause & exit /b 1
)
if not exist "%ROOT%\veriflow_app" (
    echo [ERROR] Cannot find: %ROOT%\veriflow_app
    pause & exit /b 1
)
if not exist "%ROOT%\ml_service" (
    echo [ERROR] Cannot find: %ROOT%\ml_service
    pause & exit /b 1
)

:: Auto-detect local WiFi/LAN IP
set LOCAL_IP=
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do (
    set CANDIDATE=%%A
    set CANDIDATE=!CANDIDATE: =!
    echo !CANDIDATE! | findstr /v "^127\." > nul
    if !errorlevel! == 0 (
        if not defined LOCAL_IP set LOCAL_IP=!CANDIDATE!
    )
)

if not defined LOCAL_IP (
    echo [WARN] Could not detect IP, falling back to localhost
    set LOCAL_IP=127.0.0.1
)

echo [OK] Detected IP: %LOCAL_IP%

:: Write .env for Expo app
echo EXPO_PUBLIC_SERVER_IP=%LOCAL_IP%> "%ROOT%\veriflow_app\.env"
echo EXPO_PUBLIC_SERVER_PORT=5001>> "%ROOT%\veriflow_app\.env"
echo [OK] Wrote veriflow_app\.env

:: Launch Backend
echo [1/3] Starting Backend  (port 5001)...
start "VeriFlow - Backend" cmd /k "cd /d %ROOT%\backend && node index.js"

timeout /t 3 /nobreak > nul

:: Launch ML Service
echo [2/3] Starting ML Service  (port 8000)...
start "VeriFlow - ML Service" cmd /k "cd /d %ROOT%\ml_service && python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

:: Launch Expo App
echo [3/3] Starting Expo App  (port 8081)...
start "VeriFlow - Expo App" cmd /k "cd /d %ROOT%\veriflow_app && npx expo start"

echo.
echo ========================================
echo   All services running!
echo   Backend  ^>  http://%LOCAL_IP%:5001
echo   ML API   ^>  http://%LOCAL_IP%:8000
echo   Expo     ^>  http://%LOCAL_IP%:8081
echo ========================================
pause
