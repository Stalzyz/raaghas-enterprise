#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS PRODUCTION SHIELD v14.0 — NUCLEAR CLEAN RELEASE
#  Strategy: Nuclear Purge | Reclaim 20GB+ | Atomic Launch
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
APP_ROOT="/var/www/raaghas_new"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
RELEASE_PATH="$APP_ROOT/releases/$RELEASE_NAME"
SHARED_ENV="$APP_ROOT/shared/.env"

echo "🛡️  RAAGHAS NUCLEAR CLEAN SHIELD v14.0 — $TIMESTAMP"

# ── PHASE 1: Nuclear Disk Purge ───────────────────────────────────────────────
echo "☢️  PHASE 1: Nuclear Disk Purge (Total Reclaim)..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP << 'NUCLEAR_PURGE'
  CURRENT_RELEASE=$(readlink -f /var/www/raaghas_new/current 2>/dev/null || echo "none")
  
  echo "  [1/3] Nuking all inactive releases..."
  cd /var/www/raaghas_new/releases
  for d in release_*; do
    if [ "$(readlink -f "$d")" != "$CURRENT_RELEASE" ]; then
      rm -rf "$d"
    fi
  done
  
  echo "  [2/3] Truncating massive logs..."
  find /var/log -type f -name "*.log" -exec truncate -s 0 {} + 2>/dev/null || true
  pm2 flush 2>/dev/null || true
  
  echo "  [3/3] Clearing build caches..."
  rm -rf /root/.npm/_cacache
  rm -rf /tmp/npm-*
  
  echo "✅ Space reclaimed."
  df -h / | tail -1
NUCLEAR_PURGE

# ── PHASE 2: VPS Scaffold ─────────────────────────────────────────────────────
echo "🌐 PHASE 2: Scaffolding release directory..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP "mkdir -p $RELEASE_PATH"

# ── PHASE 3: Upload Source ────────────────────────────────────────────────────
echo "📤 PHASE 3: Uploading source code..."
rsync -az --progress ./ root@$VPS_IP:$RELEASE_PATH/ \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.next' \
  --exclude='.turbo' \
  --exclude='.git' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  --exclude='apps/api/uploads'

# ── PHASE 4: Deterministic Remote Build ───────────────────────────────────────
echo "🔨 PHASE 4: Executing Remote Build (Environment-Aware)..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE_BUILD
  set -euo pipefail
  cd "$RELEASE_PATH"
  
  if [ -f "$SHARED_ENV" ]; then
    export \$(grep -v '^#' "$SHARED_ENV" | xargs)
  fi

  echo "📥 Fetching dependencies..."
  npm install --legacy-peer-deps --include=dev --quiet
  
  # Workaround for Prisma Monorepo issue: force it to use the hoisted root @prisma/client 
  # which has all the correct engine binaries downloaded by the postinstall script.
  rm -rf packages/database/node_modules/@prisma
  
  echo "⚙️  Generating Prisma Client..."
  npx prisma generate --schema=packages/database/prisma/schema.prisma
  
  echo "🚀  Safely pushing schema to DB (No data loss allowed)..."
  npx prisma db push --schema=packages/database/prisma/schema.prisma
  
  echo "🔨 Compiling @raaghas/database..."
  (cd packages/database && npm run build)
  
  echo "🔨 Compiling raaghas-api..."
  (cd apps/api && NODE_OPTIONS="--max-old-space-size=2048" npx nest build)
  
  echo "🔨 Compiling admin..."
  (cd apps/admin && NEXT_DISABLE_ESLINT=1 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=2048" npx next build --webpack)
  
  echo "🔨 Compiling storefront..."
  (cd apps/storefront && NEXT_DISABLE_ESLINT=1 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=2048" npm run build)
  
  echo "🛠️  Hardening standalone artifacts..."
  for app in admin storefront; do
    mkdir -p "apps/\$app/.next/standalone/apps/\$app/.next"
    cp -r "apps/\$app/.next/static" "apps/\$app/.next/standalone/apps/\$app/.next/static" 2>/dev/null || true
    cp -r "apps/\$app/public" "apps/\$app/.next/standalone/apps/\$app/public" 2>/dev/null || true
    ln -sfn "$SHARED_ENV" "apps/\$app/.next/standalone/apps/\$app/.env"
  done
  ln -sfn "$SHARED_ENV" "apps/api/.env"
  ln -sfn "$APP_ROOT/shared/uploads" "uploads"

  # 6. Master Seeding (v16.0)
  echo "🌱 Phase 6: Populating Master Test Data..."
  # npx tsx packages/database/scripts/master-seed.ts
REMOTE_BUILD

# ── PHASE 5: Atomic Production Swap ───────────────────────────────────────────
echo "🚀 PHASE 5: Atomic Swap & Launch..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP << 'REMOTE_LAUNCH'
  set -euo pipefail
  APP_ROOT="/var/www/raaghas_new"
  CURRENT_LINK="$APP_ROOT/current"
  NEW_RELEASE=$(ls -td $APP_ROOT/releases/release_* | head -1)
  
  echo "🔗 Atomic symlink swap..."
  ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"
  
  echo "🛑 Terminating zombie processes..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
  fuser -k 6005/tcp 6009/tcp 6010/tcp 2>/dev/null || true
  
  echo "🚀 Launching Production Services..."
  cd "$CURRENT_LINK"
  
  PRISMA_CLIENT_ENGINE_TYPE=library NODE_ENV=production PORT=6005 \
    pm2 start apps/api/dist/src/main.js --name raaghas-api -i max
  NODE_ENV=production PORT=6010 \
    pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin
  NODE_ENV=production PORT=6009 \
    pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront
    
  pm2 save
  pm2 list
  
  echo "🔧 Syncing nginx static asset paths to current release..."
  # The nginx config uses /var/www/raaghas_new/current/ symlink, which already resolves
  # correctly after the ln -sfn above. But nginx has a cached path, so we reload.
  nginx -s reload && echo "✅ Nginx reloaded — static assets now served from $NEW_RELEASE"
REMOTE_LAUNCH

echo "🎉 NUCLEAR DEPLOYMENT SUCCESSFUL!"
