#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — NUCLEAR AUTH SYNCHRONIZER (v2)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
# We use a simpler password to avoid any %40 encoding issues between Prisma/Bash
DB_PASS="RaaghasProd2024"
# Using 127.0.0.1 instead of localhost for maximum precision
DB_URL="postgresql://raaghas_user:RaaghasProd2024@127.0.0.1:5432/raaghas_db"

echo "☢️ Performing Nuclear Auth Sync..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  set -e
  cd /var/www/raaghas_new
  
  echo "🔑 Step 1: Resetting DB password to simple string..."
  sudo -u postgres psql -c "ALTER USER raaghas_user WITH PASSWORD '$DB_PASS';"
  
  echo "📝 Step 2: Updating all environment files..."
  # Find all .env files and update the DATABASE_URL line
  find . -name ".env*" -type f -exec sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|g" {} +
  
  echo "🚀 Step 3: Hard-restarting PM2 services with explicit env..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
  
  export DATABASE_URL="$DB_URL"
  export NODE_ENV="production"
  
  cd current
  # We use --update-env to force PM2 to drop old cached values
  DATABASE_URL="$DB_URL" PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api --update-env
  DATABASE_URL="$DB_URL" PORT=6010 pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin --update-env
  DATABASE_URL="$DB_URL" PORT=6009 pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront --update-env
  
  pm2 save
  
  echo "🏥 Step 4: Health check..."
  sleep 5
  curl -s http://localhost:6005/api/v1/health || echo "⚠️ API still warming up..."
REMOTE

echo "✅ Nuclear Sync complete! Please try logging in with the same admin credentials."
