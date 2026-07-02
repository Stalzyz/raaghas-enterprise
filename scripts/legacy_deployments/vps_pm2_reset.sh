#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — VPS DIAGNOSTIC & RESET SCRIPT
#  Resolves: Port 6005 conflicts, Nginx server_name clashes, and PM2 crashes.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "🔍 Starting VPS Recovery..."

# 1. Clear Nginx Conflicts
echo "🌐 Cleaning Nginx site-enabled conflicts..."
# Remove the default config if it exists and is not ours
rm -f /etc/nginx/sites-enabled/default || true
# Ensure only 'raaghas' is active in this context
ls -l /etc/nginx/sites-enabled/

# 2. Kill Zombie Processes on API port
echo "💀 Killing zombie processes on port 6005..."
fuser -k 6005/tcp || echo "Port 6005 was already clear."

# 3. Clean PM2 and Restart
echo "🚀 Resetting PM2 services..."
pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
pm2 flush # Clear old logs so we can see new errors clearly

# Restart the API specifically to check for errors
cd /var/www/raaghas_new
NODE_ENV=production PORT=6005 pm2 start apps/api/dist/src/main.js --name raaghas-api

echo "⏳ Waiting 5 seconds for API boot..."
sleep 5

echo "📋 Checking API Status..."
pm2 status raaghas-api

echo "📋 Last 20 lines of API Logs:"
pm2 logs raaghas-api --lines 20 --nostream

# 4. Reload Nginx
echo "🌐 Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "🏁 Reset complete."
