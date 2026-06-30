#!/bin/bash
# =============================================================================
#  🖥️  RAAGHAS — VPS FIRST-TIME BOOTSTRAP SCRIPT
#  Run this ONCE on a fresh Ubuntu 22.04 / 24.04 VPS as root
#  Usage: curl -sL <url> | bash   OR   bash vps_setup.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
log()     { echo -e "${CYAN}${BOLD}[SETUP]${RESET} $*"; }
success() { echo -e "${GREEN}${BOLD}[ OK  ]${RESET} $*"; }
banner()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# ── 1. System Update ──────────────────────────────────────────────────────────
banner "1. System Update"
apt-get update -y && apt-get upgrade -y
success "System updated."

# ── 2. Install Core Tools ─────────────────────────────────────────────────────
banner "2. Core Tools"
apt-get install -y \
  curl wget git unzip htop ufw \
  nginx certbot python3-certbot-nginx \
  build-essential
success "Core tools installed."

# ── 3. Install Node.js 20 LTS ─────────────────────────────────────────────────
banner "3. Node.js 20 LTS"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node --version && npm --version
success "Node.js installed: $(node -v)"

# ── 4. Install PM2 globally ───────────────────────────────────────────────────
banner "4. PM2 Process Manager"
npm install -g pm2
pm2 startup systemd -u root --hp /root
success "PM2 installed: $(pm2 --version)"

# ── 5. Install PostgreSQL ─────────────────────────────────────────────────────
banner "5. PostgreSQL"
if ! command -v psql &>/dev/null; then
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi

# Create DB + User
DB_NAME="raaghas_db"
DB_USER="raaghas_user"
DB_PASS="$(openssl rand -base64 24 | tr -d '/@+=' | head -c 20)"

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚠️  SAVE THESE CREDENTIALS — shown only once:"
echo "  DB_NAME  : $DB_NAME"
echo "  DB_USER  : $DB_USER"
echo "  DB_PASS  : $DB_PASS"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
success "PostgreSQL configured."

# ── 6. Configure UFW Firewall ─────────────────────────────────────────────────
banner "6. UFW Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh        # Port 22
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
# Internal app ports — block from public, only NGINX proxies them
ufw deny 6001/tcp
ufw deny 6002/tcp
ufw deny 6005/tcp
ufw --force enable
success "Firewall configured."

# ── 7. Configure NGINX ────────────────────────────────────────────────────────
banner "7. NGINX"
# Remove default page
rm -f /etc/nginx/sites-enabled/default

# Increase upload size limit globally (safely within http block)
if ! grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
  sed -i '/http {/a \    client_max_body_size 50M;' /etc/nginx/nginx.conf
fi

systemctl enable nginx
systemctl restart nginx
success "NGINX ready."

# ── 8. System Log Directory ───────────────────────────────────────────────────
banner "8. Log Directories"
mkdir -p /var/log/pm2
mkdir -p /var/www/raaghas_backups
success "Directories created."

# ── 9. Final Summary ──────────────────────────────────────────────────────────
banner "🎉 VPS Bootstrap Complete!"
echo -e "${BOLD}${GREEN}"
echo "  Next Steps:"
echo "  1. Copy your .env.production files locally (see .env.production.example)"
echo "  2. Update DATABASE_URL with the credentials shown above"
echo "  3. Make sure DNS A records point to this server: $(curl -s ifconfig.me)"
echo "  4. Run: bash deploy.sh from your local machine"
echo ""
echo "  Server IP: $(curl -s ifconfig.me)"
echo -e "${RESET}"
