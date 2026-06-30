#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  RAAGHAS NGINX EMERGENCY REPAIR
#  Run this DIRECTLY on the VPS to fix 404 static asset errors
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

APP_ROOT="/var/www/raaghas_new"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"

echo "🔍 Diagnosing current state..."

# --- Step 1: Find the latest successful release ---
LATEST_RELEASE=$(ls -t "$RELEASES_DIR" | head -1)
if [ -z "$LATEST_RELEASE" ]; then
  echo "❌ No releases found in $RELEASES_DIR — aborting."
  exit 1
fi
RELEASE_PATH="$RELEASES_DIR/$LATEST_RELEASE"
echo "✅ Latest release: $LATEST_RELEASE"

# --- Step 2: Verify static assets exist in that release ---
ADMIN_STATIC="$RELEASE_PATH/apps/admin/.next/standalone/apps/admin/.next/static"
ADMIN_STATIC_FALLBACK="$RELEASE_PATH/apps/admin/.next/static"

if [ -d "$ADMIN_STATIC" ]; then
  ADMIN_STATIC_PATH="$ADMIN_STATIC"
elif [ -d "$ADMIN_STATIC_FALLBACK" ]; then
  ADMIN_STATIC_PATH="$ADMIN_STATIC_FALLBACK"
else
  echo "❌ Admin static assets not found in release. Checking..."
  find "$RELEASE_PATH/apps/admin" -name "static" -type d 2>/dev/null | head -5
  echo "⚠️  Please check the paths above and update the Nginx config manually."
  exit 1
fi
echo "✅ Admin static assets found at: $ADMIN_STATIC_PATH"

STOREFRONT_STATIC="$RELEASE_PATH/apps/storefront/.next/standalone/apps/storefront/.next/static"
STOREFRONT_STATIC_FALLBACK="$RELEASE_PATH/apps/storefront/.next/static"

if [ -d "$STOREFRONT_STATIC" ]; then
  STOREFRONT_STATIC_PATH="$STOREFRONT_STATIC"
elif [ -d "$STOREFRONT_STATIC_FALLBACK" ]; then
  STOREFRONT_STATIC_PATH="$STOREFRONT_STATIC_FALLBACK"
else
  STOREFRONT_STATIC_PATH="$RELEASE_PATH/apps/storefront/.next/static"
fi
echo "✅ Storefront static assets path: $STOREFRONT_STATIC_PATH"

# --- Step 3: Fix the 'current' symlink ---
echo "🔗 Updating 'current' symlink to latest release..."
ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"
echo "✅ Symlink updated: $CURRENT_LINK -> $RELEASE_PATH"

# --- Step 4: Write the corrected Nginx configuration ---
echo "📝 Writing corrected Nginx configuration..."
cat > /etc/nginx/sites-available/raaghas << NGINX_CONF
map \$http_origin \$cors_origin {
    default "";
    "~*^https?://(www\\.)?(raaghas\\.in|admin\\.raaghas\\.in)$" \$http_origin;
    "~*^http://localhost:(6001|6002)$" \$http_origin;
}

server {
    listen 80;
    server_name raaghas.in www.raaghas.in admin.raaghas.in api.raaghas.in;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.raaghas.in;
    ssl_certificate /etc/letsencrypt/live/raaghas/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/raaghas/privkey.pem;
    client_max_body_size 50M;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        add_header 'Access-Control-Allow-Origin' \$cors_origin always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' \$cors_origin always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        proxy_pass http://127.0.0.1:6005;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.raaghas.in;
    ssl_certificate /etc/letsencrypt/live/raaghas/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/raaghas/privkey.pem;

    # Serve static assets directly from filesystem (bypass Node.js proxy)
    location /_next/static {
        alias ${ADMIN_STATIC_PATH};
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias ${RELEASE_PATH}/apps/admin/public;
        expires 365d;
        access_log off;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:6005/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:6010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name raaghas.in www.raaghas.in;
    ssl_certificate /etc/letsencrypt/live/raaghas/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/raaghas/privkey.pem;

    location /_next/static {
        alias ${STOREFRONT_STATIC_PATH};
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias ${RELEASE_PATH}/apps/storefront/public;
        expires 365d;
        access_log off;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:6005/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:6009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_CONF

echo "✅ Nginx config written"

# --- Step 5: Enable and reload Nginx ---
ln -sf /etc/nginx/sites-available/raaghas /etc/nginx/sites-enabled/raaghas
echo "🔍 Testing Nginx config..."
nginx -t

echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ NGINX REPAIR COMPLETE"
echo "   Static assets path: $ADMIN_STATIC_PATH"
echo "   Hard refresh your browser with Cmd+Shift+R"
echo "═══════════════════════════════════════════════"
