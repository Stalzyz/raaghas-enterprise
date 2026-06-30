#!/bin/bash
# VPS Disk Cleanup Analysis — SAFE, READ-ONLY first pass
# This script only REPORTS — does NOT delete anything

echo "========================================"
echo "   VPS CLEANUP ANALYSIS REPORT"
echo "   $(date)"
echo "========================================"

echo ""
echo "━━━ DISK USAGE OVERVIEW ━━━"
df -h /

echo ""
echo "━━━ TOP 20 LARGEST DIRECTORIES ━━━"
du -sh /* 2>/dev/null | sort -rh | head -20

echo ""
echo "━━━ /var/www BREAKDOWN ━━━"
du -sh /var/www/* 2>/dev/null | sort -rh | head -20

echo ""
echo "━━━ OLD RELEASES (>3 kept) ━━━"
ls -td /var/www/raaghas_new/releases/release_* 2>/dev/null | tail -n +4

echo ""
echo "━━━ OLD RELEASE SIZES ━━━"
ls -td /var/www/raaghas_new/releases/release_* 2>/dev/null | tail -n +4 | xargs -I{} du -sh {} 2>/dev/null

echo ""
echo "━━━ NPM CACHE ━━━"
du -sh ~/.npm 2>/dev/null || echo "No npm cache"
du -sh /root/.npm 2>/dev/null || echo "No root npm cache"

echo ""
echo "━━━ YARN / PNPM CACHE ━━━"
du -sh ~/.cache/yarn 2>/dev/null || echo "No yarn cache"
du -sh ~/.pnpm-store 2>/dev/null || echo "No pnpm store"
du -sh /root/.local/share/pnpm 2>/dev/null || echo "No pnpm local"

echo ""
echo "━━━ SYSTEM LOGS (large files) ━━━"
find /var/log -type f -size +10M 2>/dev/null | xargs -I{} du -sh {} 2>/dev/null | sort -rh | head -20

echo ""
echo "━━━ JOURNAL LOGS ━━━"
journalctl --disk-usage 2>/dev/null || echo "journalctl not available"

echo ""
echo "━━━ TEMP FILES ━━━"
du -sh /tmp 2>/dev/null
find /tmp -type f -mtime +1 2>/dev/null | wc -l | xargs echo "Files older than 1 day in /tmp:"

echo ""
echo "━━━ CRASH DUMPS / CORE DUMPS ━━━"
find / -name "core" -o -name "*.core" -o -name "core.*" 2>/dev/null | grep -v proc | head -10

echo ""
echo "━━━ ZIP/TAR BACKUP FILES ━━━"
find /var/www /root /home -name "*.zip" -o -name "*.tar.gz" -o -name "*.tar" -o -name "*.bak" 2>/dev/null | xargs -I{} du -sh {} 2>/dev/null | sort -rh | head -20

echo ""
echo "━━━ DOCKER (if installed) ━━━"
if command -v docker &>/dev/null; then
  echo "Docker images:"
  docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -rh | head -10
  echo "Dangling images:"
  docker images -f dangling=true
  echo "Stopped containers:"
  docker ps -a --filter status=exited --format "{{.Names}}\t{{.Size}}"
else
  echo "Docker not installed"
fi

echo ""
echo "━━━ BROKEN SYMLINKS in /var/www ━━━"
find /var/www -xtype l 2>/dev/null | head -20

echo ""
echo "━━━ NODE_MODULES in INACTIVE projects ━━━"
find /var/www -name "node_modules" -type d -not -path "*/raaghas_new/current/*" 2>/dev/null | \
  xargs -I{} du -sh {} 2>/dev/null | sort -rh | head -10

echo ""
echo "━━━ SUSPICIOUS FILES ━━━"
find /var/www /tmp /root -name "*.php" -o -name "*.sh.bak" -o -name "*.suspected" 2>/dev/null | head -20
find /tmp /var/tmp -name "*.elf" -o -name "*.bin" 2>/dev/null | head -10

echo ""
echo "━━━ PM2 STATUS ━━━"
pm2 list 2>/dev/null || echo "PM2 not found"

echo ""
echo "━━━ ACTIVE NGINX SITES ━━━"
ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "No nginx sites-enabled"

echo ""
echo "━━━ SSL CERTIFICATES ━━━"
ls /etc/letsencrypt/live/ 2>/dev/null || ls /etc/ssl/certs/*.pem 2>/dev/null | head -10 || echo "No Let's Encrypt certs"

echo ""
echo "========================================"
echo "   END OF ANALYSIS — NO FILES DELETED"
echo "========================================"
