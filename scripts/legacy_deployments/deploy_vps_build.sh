#!/bin/bash
set -euo pipefail

VPS_IP="72.61.231.187"
REMOTE_DIR="/var/www/raaghas_new"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30"

echo "🚀 Starting VPS-Native Build & Deployment..."
echo "📡 Target: $VPS_IP"

# 1. Sync local changes to VPS (excluding heavy folders)
echo "📦 Syncing local changes to VPS..."
rsync -az --progress \
  --exclude='node_modules' \
  --exclude='**/node_modules' \
  --exclude='.git' \
  --exclude='**/.git' \
  --exclude='.turbo' \
  --exclude='**/.turbo' \
  --exclude='.next' \
  --exclude='**/.next' \
  --exclude='uploads' \
  --exclude='**/uploads' \
  -e "ssh $SSH_OPTS" \
  . \
  root@$VPS_IP:$REMOTE_DIR/

# 2. Remote Build and Activate
echo "🛠️  Running remote build and activation..."
ssh $SSH_OPTS root@$VPS_IP << 'REMOTE_SCRIPT'
  set -euo pipefail
  cd /var/www/raaghas_new

  # ── Sync all env files (CRITICAL: NEXT_PUBLIC vars are baked at build time) ─
  echo "🔑 Syncing production env files..."
  cp apps/api/.env.production apps/api/.env 2>/dev/null || echo "⚠️  No api .env.production found"
  cp apps/storefront/.env.production apps/storefront/.env 2>/dev/null || echo "⚠️  No storefront .env.production found"
  cp apps/admin/.env.production apps/admin/.env 2>/dev/null || echo "⚠️  No admin .env.production found"

  # Install deps
  echo "📦 Installing dependencies on VPS..."
  npm install --legacy-peer-deps --quiet

  # Prisma Generate
  echo "⚙️  Generating Prisma client..."
  DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true) \
    ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma 2>/dev/null || true

  # Build all apps
  echo "🔨 Building apps on VPS (this may take a few minutes)..."
  DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true) \
    npx turbo build --filter=raaghas-api --filter=admin --filter=storefront

  # Inject static assets for Next.js standalone
  echo "🛠️  Injecting static assets..."
  cp -r apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/static 2>/dev/null || true
  cp -r apps/admin/public apps/admin/.next/standalone/apps/admin/public 2>/dev/null || true
  cp -r apps/storefront/.next/static apps/storefront/.next/standalone/apps/storefront/.next/static 2>/dev/null || true
  cp -r apps/storefront/public apps/storefront/.next/standalone/apps/storefront/public 2>/dev/null || true

  # Database Push
  echo "🗄️  Pushing database schema changes..."
  DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true) \
    ./node_modules/.bin/prisma db push --accept-data-loss --schema=packages/database/prisma/schema.prisma

  # Seed Templates
  echo "🌱 Seeding notification templates..."
  npx ts-node apps/api/prisma/seed-templates.ts || echo "⚠️  Seeding failed or script missing, continuing..."

  # ── Restart PM2 ────────────────────────────────────────────────────────────
  # IMPORTANT: storefront and admin MUST run with --cwd set to their standalone
  # directory so Next.js resolves .next/prerender-manifest.json correctly.
  echo "🚀 Restarting PM2 services..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true

  NODE_ENV=production PORT=6005 \
    pm2 start apps/api/dist/src/main.js --name raaghas-api

  NODE_ENV=production PORT=6010 \
    pm2 start server.js \
    --name raaghas-admin \
    --cwd /var/www/raaghas_new/apps/admin/.next/standalone/apps/admin

  NODE_ENV=production PORT=6009 \
    pm2 start server.js \
    --name raaghas-storefront \
    --cwd /var/www/raaghas_new/apps/storefront/.next/standalone/apps/storefront

  pm2 save

  echo "✅ Deployment finished successfully!"
  pm2 status
REMOTE_SCRIPT
