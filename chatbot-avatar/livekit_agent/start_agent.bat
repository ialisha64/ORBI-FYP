@echo off
echo Stopping any existing Python agent on port 5001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F 2>nul
)
timeout /t 1 /nobreak >nul

echo Starting ORBI LiveKit + Simli lip-sync agent...
cd /d "%~dp0"
python agent.py dev
