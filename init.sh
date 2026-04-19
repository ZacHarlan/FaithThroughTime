#!/usr/bin/env bash
# =============================================================================
# init.sh — Deterministic Bootstrap for Faith Through Time
# Brings the entire dev environment from zero to running in one command.
# Idempotent: safe to run repeatedly at any time.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_PORT=5180
APP_URL="http://localhost:$APP_PORT"
PROJECT_DIR="src/BibleTimeline.Web"
LOG_FILE="$ROOT_DIR/.init.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[init]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ─── Step 1: Prerequisites ──────────────────────────────────────────────────
log "Checking prerequisites..."

command -v dotnet >/dev/null 2>&1 || fail "dotnet CLI not found. Install .NET 9 SDK: https://dot.net/download"

DOTNET_VERSION=$(dotnet --version)
DOTNET_MAJOR=$(echo "$DOTNET_VERSION" | cut -d. -f1)
if [[ "$DOTNET_MAJOR" -lt 9 ]]; then
    fail ".NET 9+ required (found $DOTNET_VERSION). Install: https://dot.net/download"
fi
ok ".NET SDK $DOTNET_VERSION"

# ─── Step 2: Kill stale processes on known ports ─────────────────────────────
log "Checking for stale processes on port $APP_PORT..."

STALE_PID=$(lsof -ti tcp:$APP_PORT 2>/dev/null || true)
if [[ -n "$STALE_PID" ]]; then
    warn "Killing stale process(es) on port $APP_PORT: PID $STALE_PID"
    echo "$STALE_PID" | xargs kill -9 2>/dev/null || true
    sleep 1
fi
ok "Port $APP_PORT is clear"

# ─── Step 3: Restore dependencies ───────────────────────────────────────────
log "Restoring NuGet packages..."
dotnet restore --verbosity quiet > "$LOG_FILE" 2>&1
ok "Dependencies restored"

# ─── Step 4: Build ──────────────────────────────────────────────────────────
log "Building solution..."
dotnet build --no-restore --verbosity quiet >> "$LOG_FILE" 2>&1
ok "Build succeeded"

# ─── Step 5: Remove stale database (forces re-seed if schema changed) ───────
DB_FILE="$ROOT_DIR/$PROJECT_DIR/bin/Debug/net9.0/faith-through-time.db"
if [[ -f "$DB_FILE" ]]; then
    log "Existing database found — will re-seed if empty"
fi

# ─── Step 6: Run tests ──────────────────────────────────────────────────────
log "Running unit & integration tests..."
if dotnet test tests/BibleTimeline.Tests --no-build --verbosity quiet >> "$LOG_FILE" 2>&1; then
    TESTS_PASSED=$(grep -c "Passed" "$LOG_FILE" 2>/dev/null || echo "all")
    ok "Tests passed"
else
    warn "Some tests failed — check $LOG_FILE for details"
fi

# ─── Step 7: Start the application ──────────────────────────────────────────
log "Starting Faith Through Time on $APP_URL ..."

cd "$ROOT_DIR/$PROJECT_DIR"
dotnet run --no-build --urls "$APP_URL" >> "$LOG_FILE" 2>&1 &
APP_PID=$!
cd "$ROOT_DIR"

# ─── Step 8: Wait for health check ──────────────────────────────────────────
log "Waiting for health check..."

MAX_WAIT=30
WAITED=0
while [[ $WAITED -lt $MAX_WAIT ]]; do
    if curl -sf "$APP_URL/api/timeline/periods" > /dev/null 2>&1; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [[ $WAITED -ge $MAX_WAIT ]]; then
    fail "Application failed to start within ${MAX_WAIT}s. Check $LOG_FILE"
fi

# ─── Step 9: Print success summary ──────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Faith Through Time is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  App URL:    ${CYAN}$APP_URL${NC}"
echo -e "  App PID:    ${CYAN}$APP_PID${NC}"
echo -e "  API:        ${CYAN}$APP_URL/api/timeline${NC}"
echo -e "  Log file:   ${CYAN}$LOG_FILE${NC}"
echo ""
echo -e "  To stop:    ${YELLOW}kill $APP_PID${NC}"
echo -e "  To restart: ${YELLOW}bash init.sh${NC}"
echo ""

# Write PID file for agent-status.sh
echo "$APP_PID" > "$ROOT_DIR/.app.pid"
