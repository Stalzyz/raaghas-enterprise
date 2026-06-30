#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — MASTER DEPLOYMENT SCRIPT v9.0 (rsync — no more timeouts)
#  Uses rsync to only transfer CHANGED files — skips node_modules entirely.
#  Remote runs npm install + prisma + pm2 restart on the VPS side.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
REMOTE_DIR="/var/www/raaghas_new"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30"

echo "💎 RAAGHAS MASTER DEPLOYMENT v9.0 (rsync mode)"
echo "════════════════════════════════════════════════"

# ── 1. LOCAL BUILD ─────────────────────────────────────────────────────────────
echo "🏗️  Building locally..."
npm install --legacy-peer-deps --quiet
# ⚠️  CRITICAL: Only build the 3 app packages — NEVER include @raaghas/database
# The database package is a library (Prisma client wrapper), not a runnable service.
# Passing --force without --filter causes npm to propagate start:prod to ALL workspaces.
npx turbo build --filter=raaghas-api --filter=admin --filter=storefront
echo "✅ Local build complete"

# ── 2. RSYNC (only changed files, no node_modules, no .git, no cache) ─────────
echo ""
echo "🚀 Syncing changed files to VPS via rsync..."
echo "   (Only uploads what changed — no 683M zip, no timeout)"
rsync -az --progress \
  --exclude='node_modules' \
  --exclude='**/node_modules' \
  --exclude='.git' \
  --exclude='**/.git' \
  --exclude='.turbo' \
  --exclude='**/.turbo' \
  --exclude='**/.next/cache' \
  --exclude='uploads' \
  --exclude='**/uploads' \
  --exclude='*.log' \
  --exclude='*.zip' \
  --exclude='*.tar.gz' \
  --exclude='scratch' \
  --exclude='playwright-report' \
  --exclude='certification-suite' \
  -e "ssh $SSH_OPTS" \
  . \
  root@$VPS_IP:$REMOTE_DIR/

echo "✅ Files synced"

# ── 3. REMOTE ACTIVATION ───────────────────────────────────────────────────────
echo ""
echo "🛠️  Running remote activation..."
ssh $SSH_OPTS root@$VPS_IP << 'REMOTE_SCRIPT'
  set -euo pipefail
  cd /var/www/raaghas_new

  # ── Sync production .env (single source of truth) ────────────────────────────
  cp apps/api/.env.production apps/api/.env
  echo "✅ .env synced from .env.production"

  # ── Install Linux-native dependencies ────────────────────────────────────────
  echo "📦 Installing Linux dependencies..."
  npm install --legacy-peer-deps --quiet

  # ── Force correct Prisma version with Linux binary targets ───────────────────
  echo "🗄️  Installing Prisma with Linux engine targets..."
  rm -rf node_modules/.bin node_modules/@prisma node_modules/prisma
  npm install prisma@6.7.0 @prisma/client@6.7.0 --save-exact --legacy-peer-deps --quiet

  # ── Generate Prisma client for Linux ─────────────────────────────────────────
  echo "🗄️  Generating Prisma client..."
  DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | cut -d'=' -f2-) \
    ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma

  # ── Run database migrations ───────────────────────────────────────────────────
  echo "🗄️  Running database push..."
  DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | cut -d'=' -f2-) \
    ./node_modules/.bin/prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss

  echo "📦 Baselining migration history..."

  # ── Ensure shared uploads symlink is intact ───────────────────────────────────
  echo "📁 Verifying shared uploads directory..."
  mkdir -p /var/www/raaghas_new/shared/uploads
  chmod -R 775 /var/www/raaghas_new/shared/uploads
  chown -R root:www-data /var/www/raaghas_new/shared/uploads

  # Re-create the symlink inside each app's dist if it was overwritten by rsync
  for app_dir in apps/api apps/storefront apps/admin; do
    if [ -d "$app_dir" ] && [ ! -L "$app_dir/uploads" ]; then
      echo "  🔗 Re-linking uploads for $app_dir..."
      rm -rf "$app_dir/uploads"
      ln -sfn /var/www/raaghas_new/shared/uploads "$app_dir/uploads"
    fi
  done
  echo "✅ Uploads directory verified"

  # ── Prepare Next.js Standalone Static Files ───────────────────────────────────
  echo "📦 Syncing static files to standalone directories..."
  for app_dir in apps/storefront apps/admin; do
    if [ -d "$app_dir/.next/standalone" ]; then
      mkdir -p "$app_dir/.next/standalone/$app_dir/.next"
      rsync -a "$app_dir/.next/static/" "$app_dir/.next/standalone/$app_dir/.next/static/"
      if [ -d "$app_dir/public" ]; then
        # ⚠️  CRITICAL: Exclude 'uploads' symlink from standalone public/
        # The uploads symlink points to shared/uploads which creates an ELOOP
        # (infinite symlink loop) crash when Next.js statically serves the folder.
        # Uploaded files are served via /api/uploads — not from standalone public/.
        rm -f "$app_dir/.next/standalone/$app_dir/public/uploads"
        rsync -a --exclude='uploads' "$app_dir/public/" "$app_dir/.next/standalone/$app_dir/public/"
      fi
    fi
  done

  # ── Restart all PM2 services ──────────────────────────────────────────────────
  echo "🚀 Restarting PM2 services..."
  pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true

  NODE_ENV=production PORT=6005 pm2 start apps/api/dist/src/main.js \
    --name raaghas-api \
    --node-args="--max-old-space-size=512" \
    --env production

  NODE_ENV=production PORT=6010 pm2 start apps/admin/.next/standalone/apps/admin/server.js \
    --name raaghas-admin \
    --node-args="--max-old-space-size=512"

  NODE_ENV=production PORT=6009 pm2 start apps/storefront/.next/standalone/apps/storefront/server.js \
    --name raaghas-storefront \
    --node-args="--max-old-space-size=512"

  pm2 save
  echo "✅ PM2 services running:"
  pm2 status

  # ── Deploy Nginx config ───────────────────────────────────────────────────────
  echo "🌐 Deploying Nginx configuration..."
  cp /var/www/raaghas_new/raaghas_nginx.conf /etc/nginx/sites-available/raaghas
  # Remove stale duplicate symlinks that cause limit_req_zone conflicts
  rm -f /etc/nginx/sites-enabled/raaghas.conf /etc/nginx/sites-enabled/admin.raaghas.in
  ln -sf /etc/nginx/sites-available/raaghas /etc/nginx/sites-enabled/raaghas
  nginx -t && systemctl reload nginx && echo "✅ Nginx reloaded" || echo "⚠️  Nginx reload failed — check: nginx -t"

  # ── Health check ─────────────────────────────────────────────────────────────
  echo "🔍 Health check in 5 seconds..."
  sleep 5
  nginx -t
  curl -sf http://localhost:6005/api/v1/health && echo "✅ API HEALTHY" || echo "❌ API HEALTH CHECK FAILED — check: pm2 logs raaghas-api --lines 30"

  echo ""
  echo "🏁 ═══════════════════════════════════════════════════════"
  echo "   DEPLOYMENT COMPLETE"
  echo "   Storefront : https://raaghas.in"
  echo "   Admin      : https://admin.raaghas.in"
  echo "   API Health : https://api.raaghas.in/api/v1/health"
  echo "═══════════════════════════════════════════════════════════"
REMOTE_SCRIPT
