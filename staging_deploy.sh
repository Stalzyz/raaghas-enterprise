#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS STAGING DEPLOY
#  Runs an isolated deployment on ports 7005, 7009, 7010.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
APP_ROOT="/var/www/raaghas_staging"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
RELEASE_PATH="$APP_ROOT/releases/$RELEASE_NAME"
PRISMA_VERSION="6.7.0"

echo "🛡️  RAAGHAS STAGING DEPLOY — $TIMESTAMP"

# ── PHASE 1: System Readiness Check ───────────────────────────────────────────
echo ""
echo "🔍 Checking Environment..."
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "❌ ERROR: You are on Node $(node -v). Next.js requires Node 20 or 22."
  echo "   Please use: nvm use 22 (or 20)"
  exit 1
fi
echo "✅ Node $(node -v) detected."

# ── PHASE 2: Local Repair & Prep ──────────────────────────────────────────────
echo ""
echo "🔥 PHASE 2: Clearing build artifacts (Scorched Earth)..."
find . -name ".next" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "dist"  -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo "✅ Build caches wiped."

# ── PHASE 3: Prisma Generation (Tiered Fallback) ──────────────────────────────
echo ""
echo "⚙️  PHASE 3: Ensuring Prisma Client is ready..."
(
  cd packages/database
  
  # Tier 1: Local Generate
  if npx prisma@$PRISMA_VERSION generate --schema=prisma/schema.prisma 2>&1; then
    echo "✅ Tier 1: Prisma generated locally."
  
  # Tier 2: Pull from VPS (Fixes Mac APFS corruption)
  else
    echo "📥 Tier 1 Failed. Tier 2: Attempting to pull from VPS..."
    rsync -az --progress root@$VPS_IP:$APP_ROOT/current/packages/database/generated-client/ ./generated-client/ || true
    
    if [ -d "generated-client" ] && [ "$(ls -A generated-client 2>/dev/null)" ]; then
      echo "✅ Tier 2: Client pulled from VPS."
    else
      echo "❌ Tier 3: Manual Repair Needed. Please run: npm install @prisma/engines@$PRISMA_VERSION"
      exit 1
    fi
  fi
)

# ── PHASE 4: Sequential Build (Explicit PATH) ─────────────────────────────────
echo ""
echo "🔨 PHASE 4: Compiling Applications..."
export PATH="$(pwd)/node_modules/.bin:$PATH"
export NODE_OPTIONS="--max-old-space-size=4096"
export EXPERIMENTAL_CPUS=1
export NODE_ENV=production

echo "  [1/3] Building API..."
(cd apps/api && npm run build)

echo "  [2/3] Building ADMIN..."
(cd apps/admin && npm run build)

echo "  [3/3] Building STOREFRONT..."
(cd apps/storefront && npm run build)
echo "✅ Build Successful."

# ── PHASE 5: Artifact Preparation ─────────────────────────────────────────────
echo ""
echo "🛠️  PHASE 5: Prepping Standalone Artifacts..."
for app in admin storefront; do
  mkdir -p apps/$app/.next/standalone/apps/$app/.next/static
  cp -R apps/$app/.next/static/* apps/$app/.next/standalone/apps/$app/.next/static/ || true
  
  mkdir -p apps/$app/.next/standalone/apps/$app/public
  cp -R apps/$app/public/* apps/$app/.next/standalone/apps/$app/public/ || true
done
echo "✅ Standalone bundles ready."

# ── PHASE 6: Deployment to VPS ────────────────────────────────────────────────
echo ""
echo "📤 PHASE 6: Injecting ARTIFACTS to VPS..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP "mkdir -p $RELEASE_PATH/apps/api $RELEASE_PATH/packages/database $RELEASE_PATH/node_modules"

# 1. Database
# Exclude generated-client to force a clean generation on Linux, and exclude .env so Prisma uses the prod URL.
rsync -az --progress packages/database/ root@$VPS_IP:$RELEASE_PATH/packages/database/ --exclude='node_modules' --exclude='.env' --exclude='generated-client'

# 2. API
rsync -az --progress apps/api/dist/ root@$VPS_IP:$RELEASE_PATH/apps/api/dist/
rsync -az --progress apps/api/package.json root@$VPS_IP:$RELEASE_PATH/apps/api/package.json
[ -d "apps/api/node_modules" ] && rsync -az --progress apps/api/node_modules/ root@$VPS_IP:$RELEASE_PATH/apps/api/node_modules/ || true

# 3. Next.js Apps
rsync -az --progress apps/admin/.next/standalone/ root@$VPS_IP:$RELEASE_PATH/
rsync -az --progress apps/storefront/.next/standalone/ root@$VPS_IP:$RELEASE_PATH/

# 4. Critical Deps
mkdir -p .tmp_deps && cp -r node_modules/ts-node node_modules/typescript node_modules/dotenv node_modules/papaparse .tmp_deps/ 2>/dev/null || true
rsync -az --progress .tmp_deps/ root@$VPS_IP:$RELEASE_PATH/node_modules/
rm -rf .tmp_deps

# ── PHASE 7: Remote Launch ────────────────────────────────────────────────────
echo ""
echo "🚀 PHASE 7: Remote Launch on VPS..."
ssh -o StrictHostKeyChecking=no root@$VPS_IP "APP_ROOT='$APP_ROOT' RELEASE_NAME='$RELEASE_NAME' PRISMA_VERSION='$PRISMA_VERSION' bash -s" << 'REMOTE'
  set -euo pipefail
  RELEASE_PATH="$APP_ROOT/releases/$RELEASE_NAME"
  CURRENT_LINK="$APP_ROOT/current"

  # Kill Old
  pm2 stop staging-api staging-admin staging-storefront 2>/dev/null || true
  pm2 delete staging-api staging-admin staging-storefront 2>/dev/null || true
  fuser -k 7005/tcp 7009/tcp 7010/tcp 2>/dev/null || true

  # Load Env (Try to load from staging env if it exists, otherwise use shared)
  if [ -f "$APP_ROOT/shared/.env" ]; then
    set -a; source "$APP_ROOT/shared/.env"; set +a
  fi

  # VPS Native Prisma
  cd "$RELEASE_PATH/packages/database"
  npm install @prisma/client@$PRISMA_VERSION prisma@$PRISMA_VERSION --legacy-peer-deps --no-audit --no-fund
  npx prisma@$PRISMA_VERSION generate
  cd "$RELEASE_PATH"
  npx prisma@$PRISMA_VERSION db push --accept-data-loss --schema=packages/database/prisma/schema.prisma || true

  # Atomic Swap
  ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"

  # Shared Uploads Symlink
  mkdir -p "$APP_ROOT/shared/uploads"
  rm -rf "$RELEASE_PATH/apps/api/uploads"
  ln -sfn "$APP_ROOT/shared/uploads" "$RELEASE_PATH/apps/api/uploads"
  
  rm -rf "$RELEASE_PATH/uploads"
  ln -sfn "$APP_ROOT/shared/uploads" "$RELEASE_PATH/uploads"

  # PM2 Start
  cd "$CURRENT_LINK"
  PORT=7005 pm2 start apps/api/dist/src/main.js --name staging-api
  PORT=7010 pm2 start apps/admin/server.js --name staging-admin
  PORT=7009 pm2 start apps/storefront/server.js --name staging-storefront
  pm2 save
  
  echo "✅ STAGING ONLINE. Access at http://72.61.231.187:7009"
REMOTE

echo ""
echo "🎉 STAGING DEPLOYMENT SUCCESSFUL!"
