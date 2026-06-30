#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — DATABASE AUDITOR
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"

echo "🔍 Auditing Databases on VPS..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  echo "--- List of All Databases ---"
  sudo -u postgres psql -c "\l"
  
  echo ""
  echo "--- API Environment Check ---"
  cd /var/www/raaghas_new
  if [ -f "apps/api/.env.production" ]; then
    echo "📄 apps/api/.env.production found:"
    grep "^DATABASE_URL=" apps/api/.env.production | cut -d'@' -f2
  fi
  if [ -f "apps/api/.env" ]; then
    echo "📄 apps/api/.env found:"
    grep "^DATABASE_URL=" apps/api/.env | cut -d'@' -f2
  fi

  echo ""
  echo "--- Active Connections Count ---"
  sudo -u postgres psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
REMOTE
