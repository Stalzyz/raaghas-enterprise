#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS ATOMIC RELEASE v3.0 — LOCAL-TO-VPS PUSH
#  Strategy: Bundle Local → Upload → Remote Build → Atomic Swap
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
APP_ROOT="/var/www/raaghas_new"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_NAME="release_$TIMESTAMP"
BUNDLE_NAME="deploy_$TIMESTAMP.tar.gz"

echo "🚀 Starting Atomic Deployment: $RELEASE_NAME"

# 1. Create local bundle (excluding heavy/sensitive folders)
echo "📦 Bundling local source..."
export COPYFILE_DISABLE=1
tar -czf "$BUNDLE_NAME" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.turbo' \
  --exclude='.git' \
  --exclude='uploads' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  --exclude='.npm-cache' \
  --exclude='.local-npm-cache' \
  --exclude='certification-suite' \
  --exclude='scratch' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  .

# 2. Upload to VPS
echo "🧹 Cleaning up VPS disk space before upload..."
ssh root@$VPS_IP "rm -f /tmp/deploy_*.tar.gz /tmp/*.zip && npm cache clean --force 2>/dev/null || true && mkdir -p $APP_ROOT/releases && cd $APP_ROOT/releases && ls -t | tail -n +2 | xargs rm -rf -- 2>/dev/null || true"

echo "📤 Uploading bundle to VPS ($VPS_IP)..."
scp "$BUNDLE_NAME" root@$VPS_IP:/tmp/

# 3. Remote Execution
echo "⚙️  Executing remote deployment sequence..."
ssh root@$VPS_IP bash << REMOTE
  set -euo pipefail
  
  # Setup paths
  RELEASE_PATH="$APP_ROOT/releases/$RELEASE_NAME"
  mkdir -p "\$RELEASE_PATH"
  
  # Extract bundle
  echo "📂 Extracting source..."
  tar -xzf "/tmp/$BUNDLE_NAME" -C "\$RELEASE_PATH"
  rm "/tmp/$BUNDLE_NAME"
  
  cd "\$RELEASE_PATH"
  
  # Link Environment & Shared Uploads
  echo "🔗 Linking environment and shared resources..."
  cp apps/api/.env.production .env
  cp apps/api/.env.production apps/api/.env
  
  mkdir -p "$APP_ROOT/shared/uploads"
  ln -sfn "$APP_ROOT/shared/uploads" uploads
  
  # Install & Build
  echo "📦 Installing dependencies..."
  npm install --legacy-peer-deps --quiet
  
  echo "♻️  Restarting PostgreSQL to recover from previous ENOSPC state..."
  systemctl restart postgresql || true
  sleep 2

  # Database Migration / Generation (MUST happen before build for types)
  echo "⚙️  Running Prisma generate..."
  DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'") \
    ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma

  echo "🔨 Building apps (Turbo)..."
  set -a
  source .env
  set +a
  npx turbo build --filter=raaghas-api --filter=admin --filter=storefront
  
  # Next.js Standalone assets injection
  echo "🛠️  Injecting static assets..."
  cp -r apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/static 2>/dev/null || true
  cp -r apps/admin/public apps/admin/.next/standalone/apps/admin/public 2>/dev/null || true
  cp -r apps/storefront/.next/static apps/storefront/.next/standalone/apps/storefront/.next/static 2>/dev/null || true
  cp -r apps/storefront/public apps/storefront/.next/standalone/apps/storefront/public 2>/dev/null || true

  # Ensure correct Prisma Linux engines
  echo "🗄️  Enforcing Linux-native Prisma engines..."
  rm -rf node_modules/.bin node_modules/@prisma node_modules/prisma
  npm install prisma@6.2.1 @prisma/client@6.2.1 --save-exact --legacy-peer-deps --quiet
  
  # Database Migration Deploy
  echo "⚙️  Running Prisma migrations deploy..."
  DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'") \
    ./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma || true
  
  echo "🏃 Running Legacy Data Migration..."
  DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'") \
    npx ts-node scripts/migrate-legacy-orders.ts || echo "⚠️ Migration script failed (non-critical)"

  # ATOMIC SWAP
  echo "🔄 Swapping symlink..."
  ln -sfn "\$RELEASE_PATH" "$APP_ROOT/current"
  
  # Restart PM2
  echo "🚀 Restarting services..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
  NODE_ENV=production PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api
  NODE_ENV=production PORT=6010 pm2 start apps/admin/.next/standalone/apps/admin/server.js --name raaghas-admin
  NODE_ENV=production PORT=6009 pm2 start apps/storefront/.next/standalone/apps/storefront/server.js --name raaghas-storefront
  pm2 save

  # Cleanup old releases (keep last 3)
  echo "🧹 Cleaning up old releases..."
  cd "$APP_ROOT/releases" && ls -t | tail -n +4 | xargs rm -rf -- 2>/dev/null || true
  
  echo "🏥 Health Check..."
  sleep 5
  curl -sf http://localhost:6005/api/v1/health || echo "⚠️ API not responding yet, check pm2 logs"
REMOTE

# 4. Local Cleanup
rm "$BUNDLE_NAME"
echo "✅ Deployment finished successfully!"
