#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Learnova — Start all services (macOS / Linux)
# Usage: ./start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_SERVICE="$ROOT/services/video-service"
SERVER="$ROOT/server"
CLIENT="$ROOT/client"

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
log()  { echo -e "${CYAN}◆${NC} $1"; }
ok()   { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# ── Banner ───────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${BLUE}"
echo "  ██╗     ███████╗ █████╗ ██████╗ ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ "
echo "  ██║     ██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔═══██╗██║   ██║██╔══██╗"
echo "  ██║     █████╗  ███████║██████╔╝██╔██╗ ██║██║   ██║██║   ██║███████║"
echo "  ██║     ██╔══╝  ██╔══██║██╔══██╗██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║"
echo "  ███████╗███████╗██║  ██║██║  ██║██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║"
echo "  ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${DIM}Learn, Achieve, Grow — Platform Launcher${NC}"
echo -e "  ${DIM}─────────────────────────────────────────${NC}"
echo ""

# ── Cleanup on exit ──────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  warn "Shutting down all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  log "Stopping Docker containers..."
  docker compose -f "$VIDEO_SERVICE/docker-compose.yml" down 2>/dev/null || true
  echo -e "${BLUE}  Learnova stopped. Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 0. Ensure logs directory exists ──────────────────────────────────────────
mkdir -p "$ROOT/logs"

# ── 1. Docker Compose (Redis + MinIO) ────────────────────────────────────────
log "Starting Docker services (Redis + MinIO)..."
docker compose -f "$VIDEO_SERVICE/docker-compose.yml" up -d
ok "Docker services running."

# ── 2. Video service API ──────────────────────────────────────────────────────
log "Starting video-service (port 4001)..."
cd "$VIDEO_SERVICE"
npm run dev > "$ROOT/logs/video-service.log" 2>&1 &
PIDS+=($!)

# ── 3. Video service worker ───────────────────────────────────────────────────
log "Starting video-service worker (transcoder)..."
npm run dev:worker > "$ROOT/logs/video-worker.log" 2>&1 &
PIDS+=($!)

# ── 4. Server (main API) ──────────────────────────────────────────────────────
log "Starting server (port 4000)..."
cd "$SERVER"
npm run dev > "$ROOT/logs/server.log" 2>&1 &
PIDS+=($!)

# ── 5. Client (Next.js) ───────────────────────────────────────────────────────
log "Starting client (port 3000)..."
cd "$CLIENT"
npm run dev > "$ROOT/logs/client.log" 2>&1 &
PIDS+=($!)

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
ok "All services started!"
echo -e "  ${CYAN}Client        →${NC} http://localhost:3000"
echo -e "  ${CYAN}Server API    →${NC} http://localhost:4000/api"
echo -e "  ${CYAN}Video Service →${NC} http://localhost:4001/api"
echo -e "  ${CYAN}MinIO Console →${NC} http://localhost:9001  (minioadmin / minioadmin)"
echo -e "  ${CYAN}Redis         →${NC} localhost:6379"
echo ""
echo -e "  Logs in: ${CYAN}$ROOT/logs/${NC}"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop everything."
echo ""

# ── Wait for all background processes ────────────────────────────────────────
wait
