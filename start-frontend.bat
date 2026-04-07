@echo off
echo Stopping any existing frontend processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting frontend...
cd /d "%~dp0frontend"
npm run dev
