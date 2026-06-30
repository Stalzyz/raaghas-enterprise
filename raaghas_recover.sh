#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  🚀 RAAGHAS FULL ENVIRONMENT RECOVERY — VPS SCRIPT
#  Run this as root on your VPS: bash /tmp/raaghas_recover.sh
# ═══════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; }
inf() { echo -e "${BLUE}ℹ️  $1${NC}"; }
hdr() { echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"; echo -e "${YELLOW}  $1${NC}"; echo -e "${YELLOW}═══════════════════════════════════════${NC}"; }

hdr "PHASE 0: INITIAL DIAGNOSTICS"
inf "Node version:"; node -v 2>/dev/null || echo "not found"
inf "NPM version:";  npm -v  2>/dev/null || echo "not found"
inf "PM2 status:";   pm2 list 2>/dev/null || echo "PM2 not running"
inf "Disk space:";   df -h / | tail -1
inf "Memory:";       free -h | grep Mem
inf "Nginx:";        systemctl is-active nginx 2>/dev/null || echo "not active"
inf "PostgreSQL:";   systemctl is-active postgresql 2>/dev/null || echo "not active"

hdr "PHASE 1: FIX DNS / NETWORK"
cat > /etc/resolv.conf <<EOF
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 8.8.4.4
EOF
ok "DNS updated"

# Test connectivity
if curl -s --max-time 5 https://registry.npmjs.org > /dev/null 2>&1; then
    ok "Network OK — npm registry reachable"
else
    err "Network still failing — checking alternative"
    # Try apt DNS approach
    systemctl restart systemd-resolved 2>/dev/null || true
    sleep 2
    curl -s --max-time 10 https://registry.npmjs.org > /dev/null 2>&1 && ok "Network OK after restart" || err "CRITICAL: Network still blocked"
fi

hdr "PHASE 2: UPGRADE NODE TO 20"
CURRENT_NODE=$(node -v 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")

if [ "$CURRENT_NODE" -ge "20" ] 2>/dev/null; then
    ok "Node $CURRENT_NODE already >= 20, skipping upgrade"
else
    inf "Upgrading from Node $CURRENT_NODE → 20..."
    
    # Try nodesource first
    if curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null; then
        apt-get install -y nodejs
        ok "Node 20 installed via nodesource"
    elif curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource.sh 2>/dev/null; then
        bash /tmp/nodesource.sh && apt-get install -y nodejs
        ok "Node 20 installed"
    else
        # Fallback: install nvm locally
        export NVM_DIR="/root/.nvm"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        source "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
        nvm alias default 20
        ok "Node 20 installed via nvm"
    fi
    
    # Source any updated profile
    source /etc/profile 2>/dev/null || true
    export NVM_DIR="/root/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
fi

node -v && npm -v
ok "Node version confirmed"

hdr "PHASE 3: FIX NPM PERMISSIONS"
chown -R root:root ~/.npm 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
ok "NPM permissions fixed"

hdr "PHASE 4: LOCATE PROJECT DIRECTORY"
# Try known paths
PROJ_DIR=""
for dir in \
    "/var/www/raaghas_new/current" \
    "/var/www/raaghas/current" \
    "/var/www/current" \
    "/root/raaghas" \
    "/root/Raaghas_website" \
    "/var/www/html" \
    "/var/www/raaghas_new" \
    "/var/www/raaghas_app"; do
    if [ -f "$dir/package.json" ]; then
        PROJ_DIR="$dir"
        ok "Found project at: $PROJ_DIR"
        break
    fi
done

if [ -z "$PROJ_DIR" ]; then
    err "Project not found in common paths"
    inf "Searching..."
    PROJ_DIR=$(find /var/www /root -name "turbo.json" -maxdepth 6 2>/dev/null | head -1 | xargs dirname 2>/dev/null || echo "")
fi

if [ -z "$PROJ_DIR" ]; then
    err "CRITICAL: Cannot find project directory"
    inf "Manual listing of /var/www:"
    ls -la /var/www/ 2>/dev/null
    inf "PM2 logs to find path:"
    pm2 logs --nostream --lines 5 2>/dev/null | head -20
    exit 1
fi

cd "$PROJ_DIR"
inf "Working directory: $(pwd)"

hdr "PHASE 5: CLEAN INSTALL DEPENDENCIES"
inf "Removing corrupted node_modules and lock files..."
rm -rf node_modules package-lock.json .next dist 2>/dev/null || true
find . -name "node_modules" -maxdepth 4 -type d -not -path "*/\.*" -exec rm -rf {} + 2>/dev/null || true
ok "Old modules cleared"

inf "Running npm install..."
NODE_OPTIONS="" npm install --no-audit --no-fund --prefer-offline 2>&1 | tail -5 || \
npm install --no-audit --no-fund 2>&1 | tail -10
ok "Dependencies installed"

hdr "PHASE 6: RESTORE MISSING BINARIES"
# Install turbo globally if missing
if ! ./node_modules/.bin/turbo --version > /dev/null 2>&1; then
    inf "Installing turbo..."
    npm install turbo --save-dev 2>/dev/null || npm install -g turbo 2>/dev/null || true
fi

# Verify key binaries
inf "Checking binaries:"
[ -f "./node_modules/.bin/turbo" ]   && ok "turbo found"   || err "turbo missing"
[ -f "./node_modules/.bin/next" ]    && ok "next found"    || err "next missing"
[ -f "./node_modules/.bin/prisma" ]  && ok "prisma found"  || err "prisma missing"

hdr "PHASE 7: PRISMA SYNC"
cd "$PROJ_DIR"
if [ -f "packages/database/prisma/schema.prisma" ]; then
    npx prisma generate --schema=packages/database/prisma/schema.prisma 2>&1 | tail -3
elif [ -f "apps/api/prisma/schema.prisma" ]; then
    npx prisma generate --schema=apps/api/prisma/schema.prisma 2>&1 | tail -3
fi
ok "Prisma client generated"

hdr "PHASE 8: BUILD ALL APPS"
export NODE_OPTIONS="--max-old-space-size=4096"

# Try turbo build first
if ./node_modules/.bin/turbo build 2>&1; then
    ok "Turbo build succeeded"
elif npm run build 2>&1 | tail -20; then
    ok "npm run build succeeded"
else
    err "Full build failed — attempting per-app build"
    
    # Build API
    inf "Building API..."
    cd "$PROJ_DIR/apps/api"
    npm run build 2>&1 | tail -10 && ok "API built" || err "API build failed"
    
    # Build Storefront
    inf "Building Storefront..."
    cd "$PROJ_DIR/apps/storefront"
    npm run build 2>&1 | tail -10 && ok "Storefront built" || err "Storefront build failed"
    
    # Build Admin
    inf "Building Admin..."
    cd "$PROJ_DIR/apps/admin"
    npm run build 2>&1 | tail -10 && ok "Admin built" || err "Admin build failed"
    
    cd "$PROJ_DIR"
fi

hdr "PHASE 9: RESTART PM2 SERVICES"
# Stop all cleanly
pm2 delete raaghas-api raaghas-admin raaghas-storefront 2>/dev/null || true
sleep 2

# Try ecosystem config first
if [ -f "$PROJ_DIR/ecosystem.config.js" ]; then
    inf "Starting via ecosystem.config.js..."
    pm2 start ecosystem.config.js
elif [ -f "$PROJ_DIR/ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs
else
    inf "No ecosystem config found — starting manually..."
    
    # Start API
    if [ -f "$PROJ_DIR/apps/api/dist/src/main.js" ]; then
        pm2 start "$PROJ_DIR/apps/api/dist/src/main.js" --name "raaghas-api" -i 1 -- --max-old-space-size=2048
    fi
    
    # Start Storefront
    if [ -d "$PROJ_DIR/apps/storefront/.next" ]; then
        cd "$PROJ_DIR/apps/storefront"
        pm2 start npm --name "raaghas-storefront" -- run start
    fi
    
    # Start Admin
    if [ -d "$PROJ_DIR/apps/admin/.next" ]; then
        cd "$PROJ_DIR/apps/admin"
        pm2 start npm --name "raaghas-admin" -- run start
    fi
    
    cd "$PROJ_DIR"
fi

pm2 save
ok "PM2 services started and saved"

hdr "PHASE 10: RESTART NGINX"
nginx -t 2>&1 && systemctl restart nginx && ok "Nginx restarted" || err "Nginx config error"

hdr "PHASE 11: VERIFY ENDPOINTS"
sleep 5

inf "Checking ports..."
for port in 6001 6005 6009 3000; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$port" 2>/dev/null || echo "dead")
    echo "  Port $port → HTTP $STATUS"
done

inf "Checking public URLs..."
for url in "http://raaghas.in" "https://raaghas.in" "https://api.raaghas.in/api/v1/health"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "unreachable")
    echo "  $url → $STATUS"
done

hdr "═══ FINAL STATUS REPORT ═══"
echo ""
node -v && echo "NPM: $(npm -v)"
echo ""
pm2 list
echo ""
inf "CPU/Memory:"
top -bn1 | grep -E "(Cpu|Mem)" | head -3
echo ""
ok "Recovery script complete!"
echo ""
echo "If site is still down, run: pm2 logs --lines 50"
