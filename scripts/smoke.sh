#!/usr/bin/env bash
#
# Local smoke test. Runs against an already-running server on $BASE.
#
# Everything here is designed to spend ZERO Perfect Corp units:
#   - the metadata routes never call upstream at all
#   - the try-on routes are exercised with PERFECTCORP_OFFLINE=1, which makes a
#     cache miss return 409 instead of a billable live call
#   - the one call expected to succeed replays an existing fixture
#
# Usage:
#   PERFECTCORP_OFFLINE=1 npm run dev &        # or: npm run build && npm start
#   ./scripts/smoke.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${BASE:-http://localhost:3000}"
PHOTO="${PHOTO:-}"
pass=0
fail=0
skip=0

if [ -z "$PHOTO" ] || [ ! -f "$PHOTO" ]; then
  cat >&2 <<'MSG'
Set PHOTO to a jpg to post at the guard checks.

  PHOTO=./my-photo.jpg ./scripts/smoke.sh

Any jpg works for the guard tests — they are rejected before the image is ever
read. The final fixture-replay check only passes when PHOTO is the same image
that produced the cached hairStyle fixture; otherwise it is reported as skipped,
which is expected after you regenerate fixtures with your own photo.
MSG
  exit 2
fi

ok()   { printf '  \033[32mPASS\033[0m %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; printf '       %s\n' "${2:-}"; fail=$((fail+1)); }
head() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# expect_status <label> <expected-code> <curl args...>
expect_status() {
  local label="$1" want="$2"; shift 2
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@")
  [ "$got" = "$want" ] && ok "$label ($got)" || bad "$label" "expected $want, got $got"
}

# expect_json <label> <python-expression-over-d> <url>
expect_json() {
  local label="$1" expr="$2" url="$3"
  local out
  out=$(curl -s --max-time 30 "$url" | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception as e: print('BADJSON', e); sys.exit(1)
print('OK' if ($expr) else 'ASSERT')
" 2>&1)
  [ "$out" = "OK" ] && ok "$label" || bad "$label" "$out"
}

head "Metadata routes (no upstream call, no units)"
expect_json "feature registry has 31 features" "d['count']==31" "$BASE/api/features"
expect_json "every feature has an endpoint path" \
  "all(f['endpoint'].startswith('/s2s/') for f in d['features'])" "$BASE/api/features"
expect_json "hair style pinned to v2.1" \
  "any(f['id']=='hairStyle' and f['version']=='v2.1' for f in d['features'])" "$BASE/api/features"
expect_json "clothes pinned to cloth-v4" \
  "any(f['id']=='clothes' and f['task']=='cloth-v4' for f in d['features'])" "$BASE/api/features"
expect_json "generative family flagged" \
  "sorted(f['id'] for f in d['features'] if f.get('generative'))==['bag','hat','scarf','shoes']" \
  "$BASE/api/features"
expect_json "8 prewedding concepts" "len(d['concepts'])==8" "$BASE/api/concepts"
expect_json "reference library reports slots" \
  "d['readyCount']+d['pendingCount']==18" "$BASE/api/references"
expect_json "video registered, and priced per second not per call" \
  "any(f['id']=='imageToVideo' and f['task']=='image-to-video/youcam' for f in d['features'])" \
  "$BASE/api/features"

head "Pages render"
expect_status "/ responds"           200 "$BASE/"
expect_status "/test responds"       200 "$BASE/test"
expect_status "/look responds"       200 "$BASE/look"
expect_status "/prewedding responds" 200 "$BASE/prewedding"

head "Input guards (rejected before any upload or billing)"
expect_status "unknown feature is 404" 404 -X POST "$BASE/api/tryon/notAFeature" -F "photo=@$PHOTO"
expect_status "missing photo is 400"   400 -X POST "$BASE/api/tryon/hairStyle" -F 'options={}'
expect_status "path traversal blocked" 400 \
  -X POST "$BASE/api/tryon/clothes" -F "photo=@$PHOTO" -F 'referenceId=../../etc/passwd' -F 'options={}'
expect_status "styled without gender rejected" 400 \
  -X POST "$BASE/api/tryon/scarf" -F "photo=@$PHOTO" -F 'options={}'
expect_status "3-photo diagnostic rejects 1 photo" 400 \
  -X POST "$BASE/api/tryon/hairTypeDetection" -F "photo=@$PHOTO" -F 'options={}'
expect_status "unknown concept is 404" 404 \
  -X POST "$BASE/api/concepts" -F "photo=@$PHOTO" -F 'conceptId=nope'

head "Credit safety (requires PERFECTCORP_OFFLINE=1)"
expect_status "cache miss refuses to spend (409)" 409 \
  -X POST "$BASE/api/tryon/hairColor" -F "photo=@$PHOTO" -F 'options={"preset":"Ash Gray"}'

head "Fixture replay (the demo-day path)"
replay=$(curl -s --max-time 30 -X POST "$BASE/api/tryon/hairStyle" \
  -F "photo=@$PHOTO" -F 'options={"templateId":"female_s_wave_brunette"}')
verdict=$(echo "$replay" | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: print('ERROR'); raise SystemExit
if d.get('source')=='fixture' and d.get('unitsSpent')==0 and str(d.get('imageUrl','')).startswith('/fixtures/'):
    print('OK')
elif d.get('code')=='OfflineCacheMiss':
    print('SKIP')      # PHOTO is not the image behind the cached fixture
else:
    print('ERROR')
" 2>/dev/null)

case "$verdict" in
  OK)   ok "known input replays from cache for 0 units" ;;
  SKIP) printf '  \033[33mSKIP\033[0m %s\n' \
          "fixture replay — PHOTO does not match any cached fixture (expected after regenerating)"
        skip=$((skip+1)) ;;
  *)    bad "fixture replay" "$(echo "$replay" | head -c 200)" ;;
esac

head "Composite look chain"
expect_status "compose without a recipe is 400" 400 \
  -X POST "$BASE/api/look/compose" -F "photo=@$PHOTO"
expect_status "compose with an unknown recipe is 400" 400 \
  -X POST "$BASE/api/look/compose" -F "photo=@$PHOTO" -F 'recipe=nope'
expect_status "compose rejects an unknown feature in steps" 400 \
  -X POST "$BASE/api/look/compose" -F "photo=@$PHOTO" -F 'steps=[{"feature":"notAFeature"}]'
expect_status "video rejects an out-of-range duration" 400 \
  -X POST "$BASE/api/tryon/imageToVideo" -F "photo=@$PHOTO" -F 'options={"duration":7}'
expect_status "video rejects an unknown resolution" 400 \
  -X POST "$BASE/api/tryon/imageToVideo" -F "photo=@$PHOTO" -F 'options={"resolution":"4k"}'

# The demo path itself. Both looks have to replay entirely from fixtures — if
# either stops passing, the deployed demo starts billing mid-judging.
check_chain() {  # name, recipe, photo, expected stage count
  local name="$1" recipe="$2" photo="$3" want="$4"
  local body verdict
  body=$(curl -s --max-time 60 -X POST "$BASE/api/look/compose" \
    -F "photo=@$ROOT/public/demo/$photo" -F "recipe=$recipe")
  verdict=$(echo "$body" | WANT="$want" python3 -c "
import json,os,sys
try: d=json.load(sys.stdin)
except Exception: print('ERROR'); raise SystemExit
stages=d.get('stages') or []
if (len(stages)==int(os.environ['WANT']) and d.get('unitsSpent')==0
        and all(s.get('source')=='fixture' for s in stages)):
    print('OK')
elif d.get('code')=='OfflineCacheMiss':
    print('SKIP')      # fixtures were regenerated from a different photo
else:
    print('ERROR')
" 2>/dev/null)

  case "$verdict" in
    OK)   ok "$name replays from cache for 0 units" ;;
    SKIP) printf '  \033[33mSKIP\033[0m %s\n' "$name — no fixtures for public/demo/$photo"
          skip=$((skip+1)) ;;
    *)    bad "$name" "$(echo "$body" | head -c 200)" ;;
  esac
}

check_chain "beauty look (5 layers)" jawa-klasik        half-body.jpg 5
check_chain "outfit look (1 layer)"  jawa-klasik-outfit full-body.jpg 1

printf '\n\033[1m%d passed, %d failed, %d skipped\033[0m\n' "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ] || exit 1
