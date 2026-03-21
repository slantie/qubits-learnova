@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: Learnova — Start all services (Windows)
:: Usage: start.bat
:: ─────────────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set "ROOT=%~dp0"
:: Remove trailing backslash
set "ROOT=%ROOT:~0,-1%"

set "VIDEO_SERVICE=%ROOT%\services\video-service"
set "SERVER=%ROOT%\server"
set "CLIENT=%ROOT%\client"
set "LOGS=%ROOT%\logs"

:: ── Create logs directory ────────────────────────────────────────────────────
if not exist "%LOGS%" mkdir "%LOGS%"

echo.
echo  ██╗     ███████╗ █████╗ ██████╗ ███╗  ██╗ ██████╗ ██╗   ██╗ █████╗
echo  ██║     ██╔════╝██╔══██╗██╔══██╗████╗ ██║██╔═══██╗██║   ██║██╔══██╗
echo  ██║     █████╗  ███████║██████╔╝██╔██╗██║██║   ██║██║   ██║███████║
echo  ██║     ██╔══╝  ██╔══██║██╔══██╗██║╚████║██║   ██║╚██╗ ██╔╝██╔══██║
echo  ███████╗███████╗██║  ██║██║  ██║██║ ╚███║╚██████╔╝ ╚████╔╝ ██║  ██║
echo  ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝
echo.

:: ── 1. Docker Compose (Redis + MinIO) ────────────────────────────────────────
echo [learnova] Starting Docker services (Redis + MinIO)...
docker compose -f "%VIDEO_SERVICE%\docker-compose.yml" up -d
if errorlevel 1 (
  echo [learnova] ERROR: Docker failed to start. Is Docker Desktop running?
  pause
  exit /b 1
)
echo [learnova] Docker services running.

:: ── 2. Video service API ──────────────────────────────────────────────────────
echo [learnova] Starting video-service (port 4001)...
start "learnova: video-service" /D "%VIDEO_SERVICE%" cmd /c "npm run dev > "%LOGS%\video-service.log" 2>&1"

:: ── 3. Video service worker ───────────────────────────────────────────────────
echo [learnova] Starting video-service worker (transcoder)...
start "learnova: video-worker" /D "%VIDEO_SERVICE%" cmd /c "npm run dev:worker > "%LOGS%\video-worker.log" 2>&1"

:: ── 4. Server (main API) ──────────────────────────────────────────────────────
echo [learnova] Starting server (port 4000)...
start "learnova: server" /D "%SERVER%" cmd /c "npm run dev > "%LOGS%\server.log" 2>&1"

:: ── 5. Client (Next.js) ───────────────────────────────────────────────────────
echo [learnova] Starting client (port 3000)...
start "learnova: client" /D "%CLIENT%" cmd /c "npm run dev > "%LOGS%\client.log" 2>&1"

:: ── Summary ───────────────────────────────────────────────────────────────────
echo.
echo  [learnova] All services started!
echo.
echo    Client        -^> http://localhost:3000
echo    Server API    -^> http://localhost:4000/api
echo    Video Service -^> http://localhost:4001/api
echo    MinIO Console -^> http://localhost:9001  (minioadmin / minioadmin)
echo    Redis         -^> localhost:6379
echo.
echo    Logs in: %LOGS%\
echo.
echo  Each service runs in its own console window.
echo  Close those windows (or press Ctrl+C in each) to stop individual services.
echo  To stop Docker:  docker compose -f services\video-service\docker-compose.yml down
echo.
pause
