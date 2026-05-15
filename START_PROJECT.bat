@echo off
title Orbi - Starting All Services
color 0A
echo ==========================================
echo   ORBI - Starting All Services
echo ==========================================
echo.

:: MongoDB runs as a Windows service (auto-started)
echo [1/4] MongoDB: already running as Windows service
timeout /t 1 /nobreak >nul

:: Start Python Backend (port 8000)
echo [2/4] Starting Backend (port 8000)...
cd /d "%~dp0backend"
start "Orbi Backend" cmd /k "call venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 5 /nobreak >nul

:: Start Node.js Chat Server (port 3001)
echo [3/4] Starting Chat Server (port 3001)...
cd /d "%~dp0chatbot-avatar\server"
start "Orbi Chat Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul

:: Start React Chat UI (port 3000)
echo [4/4] Starting React Chat UI (port 3000)...
cd /d "%~dp0chatbot-avatar"
start "Orbi Chat UI" cmd /k "npm start"
timeout /t 3 /nobreak >nul

:: Start Flutter Dashboard (port 8083)
echo [5/4] Starting Flutter Dashboard (port 8083)...
cd /d "%~dp0Dashboard"
start "Orbi Dashboard" cmd /k "flutter run -d chrome --web-port 8083"

echo.
echo ==========================================
echo   All services started!
echo.
echo   Dashboard:    http://localhost:8083
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo   Chat Server:  http://localhost:3001
echo   Chat UI:      http://localhost:3000
echo ==========================================
pause

