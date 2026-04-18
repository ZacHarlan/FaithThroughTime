#!/usr/bin/env bash
# =============================================================================
# quality-sweep.sh — Garbage-collection script that finds drift
# Exits non-zero if any issues are found.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ISSUES=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

section() { echo -e "\n${BOLD}── $* ──${NC}"; }
issue()   { echo -e "  ${RED}✗${NC} $*"; ISSUES=$((ISSUES + 1)); }
warn_()   { echo -e "  ${YELLOW}!${NC} $*"; WARNINGS=$((WARNINGS + 1)); }
pass()    { echo -e "  ${GREEN}✓${NC} $*"; }

WEB_DIR="$ROOT_DIR/src/BibleTimeline.Web"
JS_DIR="$WEB_DIR/wwwroot/js"

# ─── 1. Architecture Tests ──────────────────────────────────────────────────
section "ARCHITECTURE TESTS"

ARCH_OUTPUT=$(dotnet test tests/BibleTimeline.Tests --filter "FullyQualifiedName~ArchitectureTests" --no-build --verbosity quiet 2>&1 || true)
ARCH_FAILED=$(echo "$ARCH_OUTPUT" | grep -c "Failed" 2>/dev/null || echo 0)

if [[ "$ARCH_FAILED" -gt 0 ]]; then
    issue "Architecture tests have failures — run: dotnet test --filter ArchitectureTests --verbosity normal"
else
    pass "Architecture tests pass"
fi

# ─── 2. Build Status ────────────────────────────────────────────────────────
section "BUILD"

if dotnet build --no-restore --verbosity quiet 2>/dev/null; then
    pass "Solution builds"
else
    issue "Build fails"
fi

# ─── 3. All Tests ───────────────────────────────────────────────────────────
section "FULL TEST SUITE"

ALL_TESTS=$(dotnet test tests/BibleTimeline.Tests --no-build --verbosity quiet 2>&1 || true)
ALL_FAILED=$(echo "$ALL_TESTS" | grep -oE "Failed: [0-9]+" | grep -oE "[0-9]+" || echo "0")

if [[ "$ALL_FAILED" -gt 0 ]]; then
    issue "$ALL_FAILED test(s) failing"
else
    TOTAL=$(echo "$ALL_TESTS" | grep -oE "Total tests: [0-9]+" | grep -oE "[0-9]+" || echo "?")
    pass "All $TOTAL tests pass"
fi

# ─── 4. Debug Artifacts in Source ────────────────────────────────────────────
section "DEBUG ARTIFACTS"

# JavaScript: console.log, debugger
if [[ -d "$JS_DIR" ]]; then
    CONSOLE_HITS=$(grep -rn "console\.\(log\|debug\|info\)" "$JS_DIR" --include="*.js" 2>/dev/null | grep -v "console.error" || true)
    if [[ -n "$CONSOLE_HITS" ]]; then
        issue "console.log/debug/info found in JS:"
        echo "$CONSOLE_HITS" | head -5 | sed 's/^/    /'
    else
        pass "No console.log in JS files"
    fi

    DEBUGGER_HITS=$(grep -rn "^\s*debugger" "$JS_DIR" --include="*.js" 2>/dev/null || true)
    if [[ -n "$DEBUGGER_HITS" ]]; then
        issue "'debugger' statements found in JS:"
        echo "$DEBUGGER_HITS" | sed 's/^/    /'
    else
        pass "No debugger statements in JS"
    fi
fi

# C#: Console.WriteLine, System.Diagnostics.Debug
CS_DEBUG=$(grep -rn "Console\.Write\|System\.Diagnostics\.Debug\.Write" "$WEB_DIR" --include="*.cs" 2>/dev/null || true)
if [[ -n "$CS_DEBUG" ]]; then
    issue "Debug output found in C#:"
    echo "$CS_DEBUG" | head -5 | sed 's/^/    /'
else
    pass "No Console.Write/Debug.Write in C# source"
fi

# ─── 5. Documentation Freshness ─────────────────────────────────────────────
section "DOCUMENTATION"

check_doc_exists() {
    local file="$1"
    local label="$2"
    if [[ -f "$ROOT_DIR/$file" ]]; then
        # Check if older than 30 days
        if [[ "$(uname)" == "Darwin" ]]; then
            MTIME=$(stat -f %m "$ROOT_DIR/$file")
        else
            MTIME=$(stat -c %Y "$ROOT_DIR/$file")
        fi
        NOW=$(date +%s)
        AGE_DAYS=$(( (NOW - MTIME) / 86400 ))
        if [[ $AGE_DAYS -gt 30 ]]; then
            warn_ "$label ($file) is $AGE_DAYS days old — consider reviewing"
        else
            pass "$label exists and is recent"
        fi
    else
        issue "$label ($file) is missing"
    fi
}

check_doc_exists "AGENTS.md" "AGENTS.md"
check_doc_exists "ARCHITECTURE.md" "ARCHITECTURE.md"
check_doc_exists "feature_list.json" "Feature Registry"
check_doc_exists "claude-progress.txt" "Progress Log"

# ─── 6. Config Integrity ────────────────────────────────────────────────────
section "CONFIG INTEGRITY"

# Validate feature_list.json
if [[ -f "$ROOT_DIR/feature_list.json" ]]; then
    if python3 -c "import json; json.load(open('$ROOT_DIR/feature_list.json'))" 2>/dev/null; then
        pass "feature_list.json is valid JSON"

        # Check for duplicate IDs
        DUPES=$(python3 -c "
import json
with open('$ROOT_DIR/feature_list.json') as f:
    features = json.load(f)
ids = [f['id'] for f in features]
dupes = [x for x in ids if ids.count(x) > 1]
if dupes:
    print(', '.join(set(dupes)))
" 2>/dev/null || true)

        if [[ -n "$DUPES" ]]; then
            issue "Duplicate feature IDs: $DUPES"
        else
            pass "No duplicate feature IDs"
        fi
    else
        issue "feature_list.json is not valid JSON"
    fi
fi

# Validate SQL files are embedded resources
if grep -q "EmbeddedResource.*Schema.sql" "$WEB_DIR/BibleTimeline.Web.csproj" 2>/dev/null; then
    pass "Schema.sql is configured as embedded resource"
else
    issue "Schema.sql is not configured as embedded resource in .csproj"
fi

if grep -q "EmbeddedResource.*SeedData.sql" "$WEB_DIR/BibleTimeline.Web.csproj" 2>/dev/null; then
    pass "SeedData.sql is configured as embedded resource"
else
    issue "SeedData.sql is not configured as embedded resource in .csproj"
fi

# ─── 7. Dead Code Detection ─────────────────────────────────────────────────
section "DEAD CODE"

# Check for empty directories
EMPTY_DIRS=""
while IFS= read -r dir; do
    if [[ -d "$dir" ]] && [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
        EMPTY_DIRS="$EMPTY_DIRS  $dir\n"
    fi
done < <(find "$WEB_DIR" -type d -not -path "*/bin/*" -not -path "*/obj/*" 2>/dev/null)

if [[ -n "$EMPTY_DIRS" ]]; then
    warn_ "Empty directories found (may be intentional):"
    echo -e "$EMPTY_DIRS" | sed 's/^/    /'
else
    pass "No empty source directories"
fi

# Check for .bak files
BAK_FILES=$(find "$ROOT_DIR" -name "*.bak" -not -path "*/bin/*" -not -path "*/obj/*" 2>/dev/null || true)
if [[ -n "$BAK_FILES" ]]; then
    warn_ ".bak files found (consider removing):"
    echo "$BAK_FILES" | sed 's/^/    /'
else
    pass "No .bak files"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════${NC}"
if [[ $ISSUES -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}  CLEAN — No issues or warnings found${NC}"
elif [[ $ISSUES -eq 0 ]]; then
    echo -e "${YELLOW}  $WARNINGS warning(s), 0 issues${NC}"
else
    echo -e "${RED}  $ISSUES issue(s), $WARNINGS warning(s)${NC}"
fi
echo -e "${BOLD}══════════════════════════════════════════════════${NC}"
echo ""

exit $ISSUES
