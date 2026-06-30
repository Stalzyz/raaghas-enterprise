#!/bin/bash
# VPS Recovery - Restart Raaghas services
APP_ROOT="/var/www/raaghas_new"

echo "=== Step 1: Kill stuck processes ==="
pkill -9 -f "prisma" 2>/dev/null && echo "killed prisma" || echo "no prisma to kill"
pkill -9 -f "npx" 2>/dev/null && echo "killed npx" || echo "no npx to kill"
sleep 2

echo ""
echo "=== Step 2: Latest release ==="
LATEST=$(ls -td $APP_ROOT/releases/release_* 2>/dev/null | head -1)
echo "Latest: $LATEST"

echo ""
echo "=== Step 3: Update symlink ==="
ln -sfn "$LATEST" "$APP_ROOT/current"
echo "Symlink -> $LATEST"

echo ""
echo "=== Step 4: Load env ==="
set -a
source "$APP_ROOT/shared/.env"
set +a
echo "Env loaded"

echo ""
echo "=== Step 5: Free ports ==="
fuser -k 6005/tcp 2>/dev/null || true
fuser -k 6009/tcp 2>/dev/null || true
fuser -k 6010/tcp 2>/dev/null || true
sleep 1

echo ""
echo "=== Step 6: Start PM2 services ==="
cd "$APP_ROOT/current"
PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api --no-autorestart || \
  PORT=6005 pm2 restart raaghas-api
PORT=6010 pm2 start apps/admin/server.js --name raaghas-admin --no-autorestart || \
  PORT=6010 pm2 restart raaghas-admin
PORT=6009 pm2 start apps/storefront/server.js --name raaghas-storefront --no-autorestart || \
  PORT=6009 pm2 restart raaghas-storefront

echo ""
echo "=== Step 7: Save PM2 ==="
pm2 save

echo ""
echo "=== Step 8: PM2 Status ==="
pm2 list

echo ""
echo "=== RECOVERY COMPLETE ==="
