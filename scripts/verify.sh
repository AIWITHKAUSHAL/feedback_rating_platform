#!/usr/bin/env bash
#
# Smoke-test a deployed CoursePulse environment.
#
#   ./scripts/verify.sh                       # uses the Terraform output URL
#   ./scripts/verify.sh http://localhost:8000 # or any base URL
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
source scripts/lib.sh

BASE_URL="${1:-$(tf_output application_url)}"
BASE_URL="${BASE_URL%/}"
info "Verifying $BASE_URL"

# Retry transient network/TLS failures (curl exit 35 and friends) so a single
# dropped connection to CloudFront does not fail a healthy deployment. Real
# HTTP status codes are never retried away - they are compared below.
CURL_OPTS=(-s --max-time 20 --retry 3 --retry-delay 2 --retry-all-errors)

check_status() {
  local description="$1" path="$2" expected="$3"
  local actual
  # `|| true` keeps `set -e` from exiting silently; curl reports 000 instead.
  actual="$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL$path" || true)"
  if [[ "$actual" == "$expected" ]]; then
    ok "$description ($path -> $actual)"
  elif [[ "$actual" == "000" ]]; then
    fail "$description: no response from $path (network or TLS error after retries)"
  else
    fail "$description: expected HTTP $expected from $path, got $actual"
  fi
}

check_status "health endpoint"        "/health"                200
check_status "readiness (PostgreSQL)" "/health/ready"          200
check_status "course catalogue"       "/api/courses"           200
check_status "public statistics"      "/api/stats"             200
check_status "unknown course is 404"  "/api/courses/99999999"  404
check_status "admin is protected"     "/api/admin/stats"       401
check_status "Swagger docs"           "/docs"                  200
check_status "SPA route serves React" "/admin/reviews"         200

COURSES="$(curl "${CURL_OPTS[@]}" "$BASE_URL/api/courses?page_size=1" || true)"
TOTAL="$(printf '%s' "$COURSES" | sed -n 's/.*"total":\([0-9]*\).*/\1/p')"
if [[ -n "$TOTAL" && "$TOTAL" -gt 0 ]]; then
  ok "catalogue contains $TOTAL courses"
else
  warn "catalogue is empty - run 'make deploy-seed' to load demo data"
fi

FIRST_ID="$(printf '%s' "$COURSES" | sed -n 's/.*"items":\[{"id":\([0-9]*\).*/\1/p')"
if [[ -n "$FIRST_ID" ]]; then
  check_status "course detail" "/api/courses/$FIRST_ID" 200
fi

info "Verification complete: $BASE_URL"
