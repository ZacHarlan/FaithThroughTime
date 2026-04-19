#!/usr/bin/env bash
# =============================================================================
# agent-status.sh — Dynamic context dump for AI agent orientation
# Run this at the start of any session to understand system state.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_PORT=5180
APP_URL="http://localhost:$APP_PORT"
PID_FILE="$ROOT_DIR/.app.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

section() { echo -e "\n${BOLD}── $* ──${NC}"; }

# ─── Service Status ──────────────────────────────────────────────────────────
section "SERVICE STATUS"

# Check if app is running
APP_PID=$(lsof -ti tcp:$APP_PORT 2>/dev/null || true)
if [[ -n "$APP_PID" ]]; then
    echo -e "  App:        ${GREEN}RUNNING${NC} (PID $APP_PID on port $APP_PORT)"
else
    echo -e "  App:        ${RED}STOPPED${NC} (port $APP_PORT not in use)"
fi

# Health check
if curl -sf "$APP_URL/api/timeline/periods" > /dev/null 2>&1; then
    echo -e "  API Health: ${GREEN}HEALTHY${NC} ($APP_URL)"
else
    echo -e "  API Health: ${RED}UNREACHABLE${NC}"
fi

# ─── Database Status ─────────────────────────────────────────────────────────
section "DATABASE"

DB_FILE="$ROOT_DIR/src/BibleTimeline.Web/bin/Debug/net9.0/faith-through-time.db"
if [[ -f "$DB_FILE" ]]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo -e "  Database:   ${GREEN}EXISTS${NC} ($DB_SIZE)"

    # Query stats if sqlite3 is available
    if command -v sqlite3 >/dev/null 2>&1; then
        PEOPLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM people;" 2>/dev/null || echo "?")
        EVENTS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "?")
        BOOKS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM biblical_books;" 2>/dev/null || echo "?")
        PERIODS_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM time_periods;" 2>/dev/null || echo "?")
        PE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM person_events;" 2>/dev/null || echo "?")
        echo "  People:     $PEOPLE_COUNT"
        echo "  Events:     $EVENTS_COUNT"
        echo "  Books:      $BOOKS_COUNT"
        echo "  Periods:    $PERIODS_COUNT"
        echo "  Relations:  $PE_COUNT person-event links"
    fi
else
    echo -e "  Database:   ${YELLOW}NOT CREATED${NC} (will be created on first run)"
fi

# ─── Build Status ────────────────────────────────────────────────────────────
section "BUILD"

if dotnet build --no-restore --verbosity quiet 2>/dev/null; then
    echo -e "  Build:      ${GREEN}PASSES${NC}"
else
    echo -e "  Build:      ${RED}FAILS${NC}"
fi

# ─── Test Status ─────────────────────────────────────────────────────────────
section "TESTS"

TEST_OUTPUT=$(dotnet test tests/BibleTimeline.Tests --no-build --verbosity quiet 2>&1 || true)
PASSED=$(echo "$TEST_OUTPUT" |  grep -oE "Passed: [0-9]+" | head -1 || echo "")
FAILED=$(echo "$TEST_OUTPUT" | grep -oE "Failed: [0-9]+" | head -1 || echo "")
TOTAL=$(echo "$TEST_OUTPUT" | grep -oE "Total tests: [0-9]+" | head -1 || echo "")

if [[ -n "$FAILED" && "$FAILED" != "Failed: 0" ]]; then
    echo -e "  Tests:      ${RED}$TOTAL | $PASSED | $FAILED${NC}"
else
    echo -e "  Tests:      ${GREEN}$TOTAL | $PASSED${NC}"
fi

# ─── Git Status ──────────────────────────────────────────────────────────────
section "GIT"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
    LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "no commits")
    DIRTY_COUNT=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    echo "  Branch:     $BRANCH"
    echo "  Last commit: $LAST_COMMIT"
    if [[ "$DIRTY_COUNT" -gt 0 ]]; then
        echo -e "  Dirty files: ${YELLOW}$DIRTY_COUNT${NC}"
    else
        echo -e "  Dirty files: ${GREEN}0${NC}"
    fi
else
    echo -e "  Git:        ${YELLOW}NOT INITIALIZED${NC}"
fi

# ─── Feature Registry ───────────────────────────────────────────────────────
section "FEATURES"

FEATURE_FILE="$ROOT_DIR/feature_list.json"
if [[ -f "$FEATURE_FILE" ]]; then
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json
with open('$FEATURE_FILE') as f:
    features = json.load(f)
total = len(features)
passing = sum(1 for f in features if f.get('passes', False))
failing = total - passing
print(f'  Total:      {total}')
print(f'  Passing:    {passing}')
print(f'  Failing:    {failing}')
if failing > 0:
    print('  Next work:')
    for f in features:
        if not f.get('passes', False):
            print(f\"    - [{f['id']}] {f['description'][:60]}\")
            break
" 2>/dev/null || echo "  (could not parse feature_list.json)"
    else
        echo "  feature_list.json exists (python3 not available for parsing)"
    fi
else
    echo -e "  ${YELLOW}feature_list.json not found${NC}"
fi

# ─── .NET Info ───────────────────────────────────────────────────────────────
section "ENVIRONMENT"

echo "  .NET SDK:   $(dotnet --version 2>/dev/null || echo 'not found')"
echo "  OS:         $(uname -s) $(uname -m)"
echo "  Directory:  $ROOT_DIR"

echo ""
