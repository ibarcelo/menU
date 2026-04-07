@echo off
echo Stopping any existing processes on port 8002...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8002" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting backend on port 8002...
cd /d "%~dp0backend"
"%~dp0venv\Scripts\uvicorn.exe" main:app --reload --host 0.0.0.0 --port 8002