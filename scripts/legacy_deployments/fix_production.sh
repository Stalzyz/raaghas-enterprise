#!/bin/bash
# ═══════════════════════════════════════════════════════════
# RAAGHAS PRODUCTION FIX — One-shot repair script
# Run from your Mac: bash fix_production.sh
# ═══════════════════════════════════════════════════════════
set -e

SERVER="root@72.61.231.187"
APP_ROOT="/var/www/raaghas_new"
LOCAL_ROOT="$HOME/Documents/Raaghas_website_new"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Syncing API dist/ and node_modules to server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rsync -avz --progress \
  "$LOCAL_ROOT/apps/api/node_modules/" \
  "$SERVER:$APP_ROOT/apps/api/node_modules/"

rsync -avz \
  "$LOCAL_ROOT/apps/api/dist/" \
  "$SERVER:$APP_ROOT/apps/api/dist/"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Syncing packages/database (workspace dep)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rsync -avz --exclude 'node_modules' \
  "$LOCAL_ROOT/packages/" \
  "$SERVER:$APP_ROOT/packages/"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Writing correct production .env and restarting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" bash << 'ENDSSH'
set -e

# ── Write correct production .env ─────────────────────────
cat > /var/www/raaghas_new/apps/api/.env << 'EOF'
PORT=6005
NODE_ENV=production
API_URL=https://api.raaghas.in
CORS_ORIGINS=https://raaghas.in,https://www.raaghas.in,https://admin.raaghas.in
DATABASE_URL=postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas
JWT_SECRET=87AkYYOOGO2mM8gzBOGVRGjK0Io+0MidlPPZNgdwetU88pzxNwkbQvlemYHcjSb0
GOOGLE_CLIENT_ID=26400214778-vmiat5v0jqdv5cmt1lohui9islphlfo7.apps.googleusercontent.com
EMAIL_FROM=contact@raaghas.in
PHONEPE_SALT_INDEX=1
EOF

echo "✅ .env written"

# ── Restore uploads symlink ───────────────────────────────
mkdir -p /var/www/raaghas_new/shared/uploads
rm -rf /var/www/raaghas_new/apps/api/uploads
ln -sfn /var/www/raaghas_new/shared/uploads /var/www/raaghas_new/apps/api/uploads
echo "✅ uploads symlink restored"

# ── Restart all raaghas services ─────────────────────────
pm2 restart raaghas-api
pm2 restart raaghas-storefront
pm2 restart raaghas-admin

# Give API 5 seconds to boot
sleep 5

# ── Verify API is up ──────────────────────────────────────
pm2 list | grep raaghas
echo ""
echo "🔍 API boot log:"
pm2 logs raaghas-api --lines 15 --nostream
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Verifying API is live..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.raaghas.in/api/v1/products)
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ API is LIVE! Products endpoint returning 200."
else
  echo "⚠️  API returned HTTP $HTTP_STATUS. Check logs above."
fi
