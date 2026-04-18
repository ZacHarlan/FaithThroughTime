#!/bin/bash
# Lighthouse CI test — requires app running on localhost:5180
# Usage: ./lighthouse-test.sh
# Threshold: all 4 categories must score >= 90%

set -euo pipefail

LIGHTHOUSE="${LIGHTHOUSE_BIN:-$(which lighthouse 2>/dev/null || echo "$HOME/.npm-global/bin/lighthouse")}"
URL="${1:-http://localhost:5180}"
REPORT="/tmp/lighthouse-report.json"
THRESHOLD=90

if ! command -v "$LIGHTHOUSE" &>/dev/null; then
    echo "ERROR: lighthouse CLI not found. Install with: npm install -g lighthouse"
    exit 1
fi

# Check if app is running
if ! curl -s -o /dev/null -w "" "$URL" 2>/dev/null; then
    echo "ERROR: $URL is not responding. Start the app first."
    exit 1
fi

echo "Running Lighthouse audit on $URL..."
"$LIGHTHOUSE" "$URL" \
    --chrome-flags="--headless --no-sandbox" \
    --output=json \
    --output-path="$REPORT" \
    --quiet 2>/dev/null

# Parse scores
RESULTS=$(node -e "
const r = JSON.parse(require('fs').readFileSync('$REPORT','utf8'));
const cats = r.categories;
let allPass = true;
for (const [k,v] of Object.entries(cats)) {
  const score = Math.round(v.score*100);
  const status = score >= $THRESHOLD ? 'PASS' : 'FAIL';
  if (score < $THRESHOLD) allPass = false;
  console.log(status + '  ' + k.padEnd(25) + score + '%');
}
if (!allPass) {
  console.log('');
  console.log('=== Failing audits ===');
  for (const [catKey, cat] of Object.entries(cats)) {
    if (cat.score < $THRESHOLD/100) {
      cat.auditRefs.filter(a => {
        const audit = r.audits[a.id];
        return audit && audit.score !== null && audit.score < 0.9;
      }).forEach(a => {
        const audit = r.audits[a.id];
        console.log('  [' + catKey + '] ' + a.id + ': ' + (audit.displayValue || audit.title));
      });
    }
  }
  process.exit(1);
}
")

echo "$RESULTS"
echo ""

if echo "$RESULTS" | grep -q "^FAIL"; then
    echo "❌ Lighthouse audit FAILED — one or more scores below ${THRESHOLD}%"
    exit 1
else
    echo "✅ All Lighthouse scores >= ${THRESHOLD}%"
    exit 0
fi
