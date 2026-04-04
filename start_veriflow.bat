@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   VeriFlow - One Click Launcher
echo ========================================

:: ── Auto-detect local WiFi/LAN IP ──────────────────────────────────────────
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

:: ── Resolve script location so paths are never hardcoded ───────────────────
set ROOT=%~dp0
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

set BACKEND_DIR=%ROOT%\backend
set APP_DIR=%ROOT%\veriflow_app
set ML_DIR=%ROOT%\ml_service
set APP_ENV=%APP_DIR%\.env

:: ── Write .env for Expo app ─────────────────────────────────────────────────
echo EXPO_PUBLIC_SERVER_IP=%LOCAL_IP%> "%APP_ENV%"
echo EXPO_PUBLIC_SERVER_PORT=5001>> "%APP_ENV%"
echo [OK] Wrote %APP_ENV%

:: ── Launch Backend ──────────────────────────────────────────────────────────
echo [1/3] Starting Backend  ^(port 5001^)...
start "VeriFlow - Backend" cmd /k "cd /d "%BACKEND_DIR%" && node index.js"

timeout /t 3 /nobreak > nul

:: ── Launch ML Service ───────────────────────────────────────────────────────
echo [2/3] Starting ML Service  ^(port 8000^)...
start "VeriFlow - ML Service" cmd /k "cd /d "%ML_DIR%" && python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

:: ── Launch Expo App ─────────────────────────────────────────────────────────
echo [3/3] Starting Expo App  ^(port 8081^)...
start "VeriFlow - Expo App" cmd /k "cd /d "%APP_DIR%" && npx expo start"

echo.
echo ========================================
echo   All services running!
echo   Backend  ^>  http://%LOCAL_IP%:5001
echo   ML API   ^>  http://%LOCAL_IP%:8000
echo   Expo     ^>  http://%LOCAL_IP%:8081
echo ========================================
echo   Scan the QR in the Expo window with
echo   Expo Go on your phone.
echo ========================================
pause
