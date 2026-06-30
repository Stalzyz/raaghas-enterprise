#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — VPS FULL DEPLOY v6
#  Syncs local code → VPS, rebuilds, restarts all services
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
REMOTE_DIR="/var/www/raaghas_new"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 RAAGHAS FULL DEPLOY v6"
echo "   Local:  $LOCAL_DIR"
echo "   Remote: root@$VPS_IP:$REMOTE_DIR"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: Sync ALL changed source files to VPS (fast, rsync skips unchanged)
# ──────────────────────────────────────────────────────────────────────────────
echo "📦 Step 1: Syncing source code to VPS..."
rsync -az --delete \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='node_modules' \
  --exclude='.env*' \
  --exclude='uploads' \
  --exclude='.git' \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" "root@$VPS_IP:$REMOTE_DIR/"

echo "✅ Code sync complete."
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: Remote — Fix DB, rebuild everything, restart PM2
# ──────────────────────────────────────────────────────────────────────────────
ssh -o StrictHostKeyChecking=no root@$VPS_IP << 'REMOTE'
  set -e
  cd /var/www/raaghas_new

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Step 2: Fix PostgreSQL if needed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Kill ghost postgres processes on 5432
  if command -v fuser &>/dev/null; then
    fuser -k 5432/tcp 2>/dev/null || true
  elif command -v lsof &>/dev/null; then
    lsof -t -i:5432 | xargs kill -9 2>/dev/null || true
  fi
  rm -f /tmp/.s.PGSQL.5432* /var/run/postgresql/.s.PGSQL.5432* 2>/dev/null || true

  pg_ctlcluster 16 main start 2>/dev/null || systemctl start postgresql || true
  sleep 3

  # Ensure DB user + schema exist
  sudo -u postgres psql -c "ALTER USER raaghas_user WITH PASSWORD 'Raaghas@Prod2024';" 2>/dev/null || \
  sudo -u postgres psql -c "CREATE USER raaghas_user WITH PASSWORD 'Raaghas@Prod2024';" 2>/dev/null || true

  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'raaghas_db'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE raaghas_db OWNER raaghas_user;" || true

  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE raaghas_db TO raaghas_user;" || true

  echo "✅ PostgreSQL ready."

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Step 3: Prisma schema sync"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  export DATABASE_URL="postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas_db"
  ./node_modules/.bin/prisma db push \
    --schema=packages/database/prisma/schema.prisma \
    --accept-data-loss
  ./node_modules/.bin/prisma generate \
    --schema=packages/database/prisma/schema.prisma
  echo "✅ Schema synced."

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Step 4: Rebuild API, Admin, Storefront"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Install any new deps from package.json changes
  npm install --legacy-peer-deps 2>/dev/null || true

  # Rebuild API
  echo "🔨 Building API..."
  npm run build --workspace=apps/api
  echo "✅ API built."

  # Rebuild Admin
  echo "🔨 Building Admin..."
  npm run build --workspace=apps/admin
  echo "✅ Admin built."

  # Rebuild Storefront
  echo "🔨 Building Storefront..."
  npm run build --workspace=apps/storefront
  echo "✅ Storefront built."

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Step 5: Restart all PM2 services"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true

  DATABASE_URL="postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas_db" \
  NODE_ENV=production PORT=6005 \
  pm2 start apps/api/dist/src/main.js \
    --name raaghas-api \
    --node-args="--max-old-space-size=512"

  NODE_ENV=production PORT=6010 \
  pm2 start apps/admin/.next/standalone/apps/admin/server.js \
    --name raaghas-admin \
    --node-args="--max-old-space-size=512"

  NODE_ENV=production PORT=6009 \
  pm2 start apps/storefront/.next/standalone/apps/storefront/server.js \
    --name raaghas-storefront \
    --node-args="--max-old-space-size=512"

  pm2 save

  echo ""
  echo "🔍 Final Health Check..."
  sleep 6
  curl -sf http://localhost:6005/api/v1/health && echo "✅ API IS LIVE!" || echo "❌ API Health Check FAILED"
  curl -sf http://localhost:6009 && echo "✅ STOREFRONT IS LIVE!" || echo "❌ Storefront Health Check FAILED"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  pm2 list
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REMOTE

echo ""
echo "🏁 Deploy v6 complete."
