#!/bin/bash
set -e

echo "Starting Aegis Platform from repository root..."
chmod +x apps/api/bin/aegis apps/api/start.sh 2>/dev/null || true
cd apps/api
exec ./start.sh
