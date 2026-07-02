#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS ENTERPRISE DEPLOYMENT v3.0
#  Optimized for Product Module Upgrade & GST Infrastructure
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
APP_ROOT="/var/www/raaghas_new"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
RELEASE_PATH="$RELEASES_DIR/$RELEASE_NAME"
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo "🚀 INITIATING RAAGHAS ENTERPRISE DEPLOYMENT [$TIMESTAMP]"
echo "📌 Branch: $GIT_BRANCH"

# ── STEP 1: SSH & Environment Check ───────────────────────────────────────────
echo "🔌 Testing SSH connectivity to $VPS_IP..."
if ! ssh -o ConnectTimeout=5 root@$VPS_IP "echo connectivity_ok" 2>/dev/null; then
  echo "❌ Error: Cannot reach VPS via SSH. Check your IP/Key/Firewall."
  exit 1
fi

# Resolve remote .env
REMOTE_ENV=$(ssh root@$VPS_IP "
  for f in '$APP_ROOT/shared/.env' '$APP_ROOT/.env.production' '$APP_ROOT/.env'; do
    [ -f \"\$f\" ] && echo \"\$f\" && break
  done
")

if [ -z "$REMOTE_ENV" ]; then
  echo "❌ Error: No .env found on remote server at $APP_ROOT"
  exit 1
fi

# ── STEP 2: Execute Remote Deployment ──────────────────────────────────────────
ssh root@$VPS_IP bash << REMOTE
  set -euo pipefail
  
  echo "📦 Pre-Deployment: Creating Database Snapshot..."
  export \$(grep -v '^#' "$REMOTE_ENV" | xargs)
  DB_NAME=\$(echo \$DATABASE_URL | sed 's/.*\///' | cut -d'?' -f1)
  mkdir -p "$APP_ROOT/backups"
  pg_dump \$DATABASE_URL > "$APP_ROOT/backups/pre_enterprise_\$TIMESTAMP.sql"
  echo "✅ Backup created: backups/pre_enterprise_\$TIMESTAMP.sql"

  echo "📥 Cloning Repository..."
  mkdir -p "$RELEASE_PATH"
  git clone --depth=1 --branch $GIT_BRANCH https://github.com/raaghas/raaghas-monorepo.git "$RELEASE_PATH"
  cd "$RELEASE_PATH"

  echo "🛠️ Installing Dependencies..."
  npm install --legacy-peer-deps --silent

  echo "⚙️  Database: Prisma Generate & Migrate..."
  cp "$REMOTE_ENV" apps/api/.env
  ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma
  DATABASE_URL="\$DATABASE_URL" ./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma

  echo "🔍 Verifying Enterprise Schema..."
  HSN_EXISTS=\$(psql "\$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='hsnCode';")
  if [ "\$HSN_EXISTS" != "1" ]; then
    echo "❌ Error: hsnCode column missing in Product table after migration!"
    exit 1
  fi
  echo "✅ Schema verified (HSN & Variants active)."

  echo "🔨 Building Monorepo..."
  DATABASE_URL="\$DATABASE_URL" npx turbo build --filter=raaghas-api --filter=admin --filter=storefront

  echo "📦 Injecting Standalone Assets..."
  # Admin
  cp -r apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/static 2>/dev/null || true
  cp -r apps/admin/public apps/admin/.next/standalone/apps/admin/public 2>/dev/null || true
  # Storefront
  cp -r apps/storefront/.next/static apps/storefront/.next/standalone/apps/storefront/.next/static 2>/dev/null || true
  cp -r apps/storefront/public apps/storefront/.next/standalone/apps/storefront/public 2>/dev/null || true

  echo "📂 Linking Shared Resources..."
  mkdir -p "$APP_ROOT/shared/uploads"
  rm -rf uploads
  ln -sfn "$APP_ROOT/shared/uploads" uploads

  echo "🔗 Atomic Switchover..."
  ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"

  echo "🚀 Process Management: PM2 Reload..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
  cd "$CURRENT_LINK"
  NODE_ENV=production PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api
  NODE_ENV=production PORT=6010 pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin
  NODE_ENV=production PORT=6009 pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront
  pm2 save

  echo "🧹 Cleaning up old releases..."
  cd "$RELEASES_DIR" && ls -t | tail -n +4 | xargs rm -rf -- 2>/dev/null || true

  echo "🏥 Enterprise Health Audit..."
  sleep 10
  API_STATUS=\$(curl -sf http://localhost:6005/api/v1/health || echo "FAILED")
  if echo "\$API_STATUS" | grep -q "RAAGHAS_STABLE"; then
    echo "✅ DEPLOYMENT SUCCESSFUL: System is Stable."
  else
    echo "⚠️  Health check uncertain. Inspecting logs..."
    pm2 logs raaghas-api --lines 50 --nostream
    exit 1
  fi
REMOTE

echo "🎉 Enterprise Upgrade Deployed Successfully!"
