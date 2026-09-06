#!/usr/bin/env bash
# Aegis Platform API Keep-Alive Script
# Usage: ./scripts/keepalive.sh [URL]
# Default target: https://aegis-platform-wwgp.onrender.com

set -euo pipefail

TARGET_URL="${1:-${AEGIS_API_URL:-https://aegis-platform-wwgp.onrender.com}}"
HEALTH_URL="${TARGET_URL%/}/health"
READY_URL="${TARGET_URL%/}/health/ready"

echo "================================================="
echo " Aegis Keep-Alive & Health Monitor               "
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")     "
echo " Target:    ${HEALTH_URL}                        "
echo "================================================="

# 1. Fast Keep-Alive Ping
echo -n "Pinging /health... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${HEALTH_URL}" || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "OK (HTTP 200)"
else
  echo "FAILED (HTTP ${HTTP_CODE})"
fi

# 2. Deep Readiness Probe (Optional Inspection)
echo -n "Checking /health/ready... "
READY_RESPONSE=$(curl -s --max-time 15 "${READY_URL}" || echo '{"status":"timeout"}')
echo "${READY_RESPONSE}"
