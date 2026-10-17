#!/usr/bin/env bash
# ==============================================================================
# Campaigns API Production Smoke Test Script
# Usage: ./scripts/smoke.sh <base-url>
# Example: ./scripts/smoke.sh https://campaigns-api.onrender.com
#          ./scripts/smoke.sh http://localhost:4000
# ==============================================================================

set -euo pipefail

# ANSI Color Codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]; then
  echo -e "${RED}Error: Missing required argument <base-url>${NC}"
  echo "Usage: $0 <base-url>"
  echo "Example: $0 https://campaigns-api.onrender.com"
  exit 1
fi

BASE_URL="${1%/}"
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${BLUE}  Running Smoke Tests Against: ${YELLOW}${BASE_URL}${NC}"
echo -e "${BLUE}================================================================${NC}\n"

# Helper for asserting HTTP status and response
assert_check() {
  local check_name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local condition_met="$4"
  local failure_detail="${5:-}"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  if [ "$actual_status" -eq "$expected_status" ] && [ "$condition_met" -eq 1 ]; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e " [${GREEN}PASS${NC}] ${check_name} (HTTP ${actual_status})"
  else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e " [${RED}FAIL${NC}] ${check_name} (Expected HTTP ${expected_status}, got ${actual_status})"
    if [ -n "$failure_detail" ]; then
      echo -e "        ${RED}Detail:${NC} ${failure_detail}"
    fi
  fi
}

# ------------------------------------------------------------------------------
# 1. Health Check: GET /health
# ------------------------------------------------------------------------------
echo -e "${YELLOW}1. Health Check Endpoint (/health)...${NC}"
HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health" || echo -e "\n000")
HEALTH_CODE=$(echo "$HEALTH_RESP" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESP" | sed '$d')

HEALTH_OK=0
if echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  HEALTH_OK=1
fi
assert_check "Health check returns status ok" 200 "$HEALTH_CODE" "$HEALTH_OK" "$HEALTH_BODY"

# ------------------------------------------------------------------------------
# 2. Config & Estimates: GET /api/v1/config/estimates
# ------------------------------------------------------------------------------
echo -e "${YELLOW}2. Platform Estimates Configuration (/api/v1/config/estimates)...${NC}"
CONFIG_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/config/estimates" || echo -e "\n000")
CONFIG_CODE=$(echo "$CONFIG_RESP" | tail -n1)
CONFIG_BODY=$(echo "$CONFIG_RESP" | sed '$d')

CONFIG_OK=0
if echo "$CONFIG_BODY" | grep -q 'platformFeePct'; then
  CONFIG_OK=1
fi
assert_check "Platform estimates return fee and reach math" 200 "$CONFIG_CODE" "$CONFIG_OK" "$CONFIG_BODY"

# ------------------------------------------------------------------------------
# 3. Public Campaigns Feed: GET /api/v1/campaigns
# ------------------------------------------------------------------------------
echo -e "${YELLOW}3. Public Campaigns Feed (/api/v1/campaigns)...${NC}"
FEED_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/campaigns?status=FUNDING&limit=5" || echo -e "\n000")
FEED_CODE=$(echo "$FEED_RESP" | tail -n1)
FEED_BODY=$(echo "$FEED_RESP" | sed '$d')

FEED_OK=0
SAMPLE_CAMPAIGN_ID=""
if echo "$FEED_BODY" | grep -q '"items"'; then
  FEED_OK=1
  # Extract first campaign ID using node or sed
  SAMPLE_CAMPAIGN_ID=$(echo "$FEED_BODY" | node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      try {
        const json = JSON.parse(data);
        if (json.items && json.items.length > 0) {
          console.log(json.items[0].id);
        }
      } catch (e) {}
    });
  ')
fi
assert_check "Campaigns feed returns list of campaigns" 200 "$FEED_CODE" "$FEED_OK" "$FEED_BODY"

# ------------------------------------------------------------------------------
# 4. Auth Sign-In: POST /api/v1/auth/sign-in
# ------------------------------------------------------------------------------
echo -e "${YELLOW}4. Authentication Sign-In (/api/v1/auth/sign-in)...${NC}"
AUTH_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@demo.com","password":"Demo@1234"}' || echo -e "\n000")
AUTH_CODE=$(echo "$AUTH_RESP" | tail -n1)
AUTH_BODY=$(echo "$AUTH_RESP" | sed '$d')

AUTH_OK=0
ACCESS_TOKEN=""
if echo "$AUTH_BODY" | grep -q '"accessToken"'; then
  AUTH_OK=1
  ACCESS_TOKEN=$(echo "$AUTH_BODY" | node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      try {
        const json = JSON.parse(data);
        if (json.tokens && json.tokens.accessToken) {
          console.log(json.tokens.accessToken);
        }
      } catch (e) {}
    });
  ')
fi
assert_check "Creator sign-in succeeds with valid JWT" 200 "$AUTH_CODE" "$AUTH_OK" "$AUTH_BODY"

# ------------------------------------------------------------------------------
# 5. Campaign Detail: GET /api/v1/campaigns/:id
# ------------------------------------------------------------------------------
echo -e "${YELLOW}5. Single Campaign Detail (/api/v1/campaigns/:id)...${NC}"
if [ -z "$SAMPLE_CAMPAIGN_ID" ]; then
  # Fallback to known seeded water campaign UUID if list was empty
  SAMPLE_CAMPAIGN_ID="f47ac10b-58cc-4372-a567-0e02b2c3d479"
fi

DETAIL_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/campaigns/${SAMPLE_CAMPAIGN_ID}" || echo -e "\n000")
DETAIL_CODE=$(echo "$DETAIL_RESP" | tail -n1)
DETAIL_BODY=$(echo "$DETAIL_RESP" | sed '$d')

DETAIL_OK=0
if echo "$DETAIL_BODY" | grep -q "$SAMPLE_CAMPAIGN_ID"; then
  DETAIL_OK=1
fi
assert_check "Fetches single campaign by ID" 200 "$DETAIL_CODE" "$DETAIL_OK" "$DETAIL_BODY"

# ------------------------------------------------------------------------------
# 6. Contribution Quote: POST /api/v1/campaigns/:id/quote
# ------------------------------------------------------------------------------
echo -e "${YELLOW}6. Transparent Contribution Quote Calculation (/api/v1/campaigns/:id/quote)...${NC}"
QUOTE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/campaigns/${SAMPLE_CAMPAIGN_ID}/quote" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":2500}' || echo -e "\n000")
QUOTE_CODE=$(echo "$QUOTE_RESP" | tail -n1)
QUOTE_BODY=$(echo "$QUOTE_RESP" | sed '$d')

QUOTE_OK=0
# For $25.00 (2500 cents): adBudget=2250, platformFee=250, procFee=103, total=2603
if echo "$QUOTE_BODY" | grep -q '"totalCents":2603'; then
  QUOTE_OK=1
fi
assert_check "Quote calculates exact breakdown: 90% ad budget (\$22.50), 10% fee (\$2.50), processing fee (\$1.03)" 200 "$QUOTE_CODE" "$QUOTE_OK" "$QUOTE_BODY"

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}================================================================${NC}"
echo -e "  Smoke Test Results: ${GREEN}${PASSED_CHECKS}/${TOTAL_CHECKS} passed${NC}"
if [ "$FAILED_CHECKS" -gt 0 ]; then
  echo -e "  ${RED}Status: FAILED (${FAILED_CHECKS} check(s) failed)${NC}"
  echo -e "${BLUE}================================================================${NC}\n"
  exit 1
else
  echo -e "  ${GREEN}Status: ALL CHECKS PASSED${NC}"
  echo -e "${BLUE}================================================================${NC}\n"
  exit 0
fi
