#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — GLOBAL AUTH SYNCHRONIZER
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
DB_PASS="Raaghas@Prod2024"
DB_URL="postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas_db"

echo "🔄 Synchronizing Production Auth & Database..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  set -e
  cd /var/www/raaghas_new
  
  echo "🔑 Step 1: Force-resetting DB password to known state..."
  sudo -u postgres psql -c "ALTER USER raaghas_user WITH PASSWORD '$DB_PASS';"
  
  echo "📝 Step 2: Patching all .env files on VPS..."
  # Find all .env and .env.production files and update the DATABASE_URL line
  find . -name ".env*" -type f -exec sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|g" {} +
  
  echo "🚀 Step 3: Hard-restarting PM2 services with fresh environment..."
  pm2 stop all || true
  
  # We start them with the explicit DATABASE_URL to override any cached env
  export DATABASE_URL="$DB_URL"
  export NODE_ENV="production"
  
  # Restart API
  cd current
  PORT=6005 DATABASE_URL="$DB_URL" pm2 start apps/api/dist/src/main.js --name raaghas-api --update-env
  
  # Restart Admin
  PORT=6010 DATABASE_URL="$DB_URL" pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin --update-env
  
  # Restart Storefront
  PORT=6009 DATABASE_URL="$DB_URL" pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront --update-env
  
  pm2 save
  
  echo "🏥 Step 4: Verifying API Health..."
  sleep 5
  curl -s http://localhost:6005/api/v1/health || echo "⚠️ API still warming up..."
REMOTE

echo "✅ Synchronization complete! Please try logging in again."
