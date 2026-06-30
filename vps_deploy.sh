#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS VPS-NATIVE DEPLOY — Paste this entire script into your VPS console
#  It builds FROM the existing code already on the VPS (no Git, no upload)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_ROOT="/var/www/raaghas_new"
CURRENT_LINK="$APP_ROOT/current"
RELEASES_DIR="$APP_ROOT/releases"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
RELEASE_PATH="$RELEASES_DIR/$RELEASE_NAME"

echo "💎 RAAGHAS VPS-NATIVE BUILD — $TIMESTAMP"

# ── 1. Locate the environment file ────────────────────────────────────────────
ENV_SOURCE=""
for f in "$APP_ROOT/shared/.env" "$APP_ROOT/.env.production" "$APP_ROOT/.env" "$CURRENT_LINK/apps/api/.env"; do
  if [ -f "$f" ]; then ENV_SOURCE="$f"; break; fi
done

if [ -z "$ENV_SOURCE" ]; then
  echo "❌ No .env file found! Cannot deploy without environment."
  exit 1
fi
echo "✅ Using env: $ENV_SOURCE"

# Extract DATABASE_URL for build step
DB_URL=$(grep '^DATABASE_URL=' "$ENV_SOURCE" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL not found in $ENV_SOURCE"
  exit 1
fi
echo "✅ DATABASE_URL found."

# ── 2. Create new release from current code ───────────────────────────────────
echo "📂 Creating release directory: $RELEASE_NAME"
mkdir -p "$RELEASE_PATH"

# Copy current source (not the symlink, but the actual previous release or source)
SOURCE_CODE=""
if [ -d "$CURRENT_LINK" ] && [ ! -L "$CURRENT_LINK" ]; then
  SOURCE_CODE="$CURRENT_LINK"
elif [ -L "$CURRENT_LINK" ]; then
  SOURCE_CODE=$(readlink -f "$CURRENT_LINK")
fi

if [ -z "$SOURCE_CODE" ] || [ ! -d "$SOURCE_CODE" ]; then
  echo "❌ Cannot find source code directory."
  exit 1
fi

echo "📋 Copying source from: $SOURCE_CODE"
rsync -a --exclude='.next' --exclude='node_modules' --exclude='uploads' --exclude='.turbo' \
  "$SOURCE_CODE/" "$RELEASE_PATH/"

cd "$RELEASE_PATH"

# ── 3. Install dependencies ───────────────────────────────────────────────────
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --quiet

# ── 4. Generate Prisma Client (REQUIRED BEFORE BUILD) ─────────────────────────
echo "⚙️  Generating Prisma client..."
DATABASE_URL="$DB_URL" ./node_modules/.bin/prisma generate \
  --schema=packages/database/prisma/schema.prisma

# ── 5. Build all apps ─────────────────────────────────────────────────────────
echo "🔨 Building all apps (may take 5-10 minutes)..."
DATABASE_URL="$DB_URL" npx turbo build \
  --filter=raaghas-api \
  --filter=admin \
  --filter=storefront

# ── 6. Inject Next.js standalone static assets ───────────────────────────────
echo "🛠️  Injecting static assets..."
cp -r apps/admin/.next/static \
  apps/admin/.next/standalone/apps/admin/.next/static 2>/dev/null || true
cp -r apps/admin/public \
  apps/admin/.next/standalone/apps/admin/public 2>/dev/null || true
cp -r apps/storefront/.next/static \
  apps/storefront/.next/standalone/apps/storefront/.next/static 2>/dev/null || true
cp -r apps/storefront/public \
  apps/storefront/.next/standalone/apps/storefront/public 2>/dev/null || true

# ── 7. Link env and shared uploads ───────────────────────────────────────────
cp "$ENV_SOURCE" apps/api/.env
mkdir -p "$APP_ROOT/shared/uploads"
rm -rf uploads
ln -sfn "$APP_ROOT/shared/uploads" uploads

# ── 8. Run database migrations ───────────────────────────────────────────────
echo "⚙️  Running database migrations..."
DATABASE_URL="$DB_URL" ./node_modules/.bin/prisma migrate deploy \
  --schema=packages/database/prisma/schema.prisma

echo "🏃 Running Legacy Data Migration..."
DATABASE_URL="$DB_URL" npx ts-node scripts/migrate-legacy-orders.ts || echo "⚠️ Migration script failed (non-critical)"

# ── 8. Atomic symlink swap ───────────────────────────────────────────────────
echo "🔗 Swapping symlink to new release..."
ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"

# ── 9. Restart PM2 ───────────────────────────────────────────────────────────
echo "🚀 Restarting PM2 services..."
cd "$CURRENT_LINK"
pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true

NODE_ENV=production PORT=6005 \
  pm2 start apps/api/dist/src/main.js \
  --name raaghas-api \
  --env production

NODE_ENV=production PORT=6010 \
  pm2 start apps/admin/.next/standalone/apps/admin/server.js \
  --name raaghas-admin

NODE_ENV=production PORT=6009 \
  pm2 start apps/storefront/.next/standalone/apps/storefront/server.js \
  --name raaghas-storefront

pm2 save

# ── 10. Cleanup old releases (keep last 3) ───────────────────────────────────
cd "$RELEASES_DIR" && ls -t | tail -n +4 | xargs rm -rf -- 2>/dev/null || true

# ── 11. Health check ─────────────────────────────────────────────────────────
echo "🏥 Health check (waiting 10s for services to start)..."
sleep 10
HEALTH=$(curl -sf http://localhost:6005/api/v1/health 2>/dev/null || echo "NO_RESPONSE")

echo ""
echo "API Response: $HEALTH"
echo ""

if echo "$HEALTH" | grep -q "RAAGHAS_STABLE"; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✅ DEPLOYMENT COMPLETE & HEALTHY! 🎉   ║"
  echo "╚══════════════════════════════════════════╝"
else
  echo "⚠️  Deployment done but health check uncertain."
  echo "📋 Last API logs:"
  pm2 logs raaghas-api --lines 20 --nostream 2>/dev/null || true
fi

pm2 status
