#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — API LOG RETRIEVER
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"

echo "📡 Fetching API logs from VPS..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  echo "--- PM2 Status ---"
  pm2 list
  echo ""
  echo "--- API Error Logs (Last 50 Lines) ---"
  pm2 logs raaghas-api --lines 50 --err --no-daemon &
  LOG_PID=\$!
  sleep 3
  kill \$LOG_PID
REMOTE
