#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS VPS-NATIVE ENTERPRISE DEPLOYMENT v3.0
#  Run this directly on your VPS.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_ROOT="/var/www/raaghas_new"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
RELEASE_PATH="$RELEASES_DIR/$RELEASE_NAME"
GIT_REPO="https://github.com/raaghas/raaghas-monorepo.git" # Update if private

echo "💎 RAAGHAS ENTERPRISE DEPLOY (VPS-NATIVE) — $TIMESTAMP"

# 1. Environment Setup
REMOTE_ENV=""
for f in "$APP_ROOT/shared/.env" "$APP_ROOT/.env.production" "$APP_ROOT/.env"; do
  [ -f "$f" ] && REMOTE_ENV="$f" && break
done

if [ -z "$REMOTE_ENV" ]; then
  echo "❌ Error: .env not found!"
  exit 1
fi

export $(grep -v '^#' "$REMOTE_ENV" | xargs)

# 2. Pre-Migration Backup
echo "📦 Backing up database..."
mkdir -p "$APP_ROOT/backups"
pg_dump $DATABASE_URL > "$APP_ROOT/backups/pre_enterprise_$TIMESTAMP.sql"

# 3. Source & Build
echo "📥 Cloning Repository..."
mkdir -p "$RELEASE_PATH"
git clone --depth=1 "$GIT_REPO" "$RELEASE_PATH"
cd "$RELEASE_PATH"

echo "📦 Installing Dependencies..."
npm install --legacy-peer-deps --silent

echo "⚙️  Database: Prisma Generate & Migrate..."
cp "$REMOTE_ENV" apps/api/.env
./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma
DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma

echo "🔨 Building Monorepo..."
DATABASE_URL="$DATABASE_URL" npx turbo build --filter=raaghas-api --filter=admin --filter=storefront

echo "🛠️ Asset Injection..."
cp -r apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/static 2>/dev/null || true
cp -r apps/admin/public apps/admin/.next/standalone/apps/admin/public 2>/dev/null || true
cp -r apps/storefront/.next/static apps/storefront/.next/standalone/apps/storefront/.next/static 2>/dev/null || true
cp -r apps/storefront/public apps/storefront/.next/standalone/apps/storefront/public 2>/dev/null || true

# 4. Atomic Swap
echo "🔗 Swapping Symlinks..."
ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"

# 5. Restart Services
echo "🚀 Restarting PM2..."
pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
cd "$CURRENT_LINK"
NODE_ENV=production PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api
NODE_ENV=production PORT=6010 pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin
NODE_ENV=production PORT=6009 pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront
pm2 save

# 6. Cleanup
cd "$RELEASES_DIR" && ls -t | tail -n +4 | xargs rm -rf -- 2>/dev/null || true

echo "✅ DEPLOYMENT FINISHED!"
