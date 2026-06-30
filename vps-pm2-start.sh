#!/bin/bash
# VPS PM2 Quick-Start — fire and forget, don't wait for online state
APP_ROOT="/var/www/raaghas_new"

echo "Loading env..."
set -a
source "$APP_ROOT/shared/.env"
set +a

echo "Freeing ports..."
fuser -k 6005/tcp 2>/dev/null || true
fuser -k 6009/tcp 2>/dev/null || true
fuser -k 6010/tcp 2>/dev/null || true
sleep 1

cd "$APP_ROOT/current"

echo "Starting raaghas-api..."
PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api 2>&1 &
PM2_API_PID=$!

echo "Starting raaghas-admin..."
PORT=6010 pm2 start apps/admin/server.js --name raaghas-admin 2>&1 &
PM2_ADMIN_PID=$!

echo "Starting raaghas-storefront..."
PORT=6009 pm2 start apps/storefront/server.js --name raaghas-storefront 2>&1 &
PM2_STOREFRONT_PID=$!

echo "Waiting 15s for processes to start..."
sleep 15

echo "Saving PM2..."
pm2 save

echo ""
echo "=== PM2 STATUS ==="
pm2 list

echo ""
echo "=== PORT CHECK ==="
ss -tlnp | grep -E "6005|6009|6010" || echo "Ports not yet bound"

echo "Done."
