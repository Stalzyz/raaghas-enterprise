#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — VPS DEEP CLEANUP SCRIPT
#  Removes all redundant zip archives, logs, and temp files to free up space.
#  Safe for core production files.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
REMOTE_DIR="/var/www/raaghas_new"

echo "🧹 RAAGHAS VPS DEEP CLEANUP"
echo "   Target: root@$VPS_IP"
echo ""

ssh -o StrictHostKeyChecking=no root@$VPS_IP << 'REMOTE'
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  1. Current Disk Usage"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  df -h /

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  2. Purging Archives, Turbo Cache & Temp Files"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Remove all .turbo folders (completely useless on production VPS)
  find /var/www/raaghas_new -name ".turbo" -type d -exec rm -rf {} + -print
  
  # Find and delete all .zip, .tar.gz, .rar files recursively
  find /var/www/raaghas_new -maxdepth 3 -name "*.zip" -type f -delete -print
  find /var/www/raaghas_new -maxdepth 3 -name "*.tar.gz" -type f -delete -print
  find /var/www/raaghas_new -maxdepth 3 -name "*.tar.zst" -type f -delete -print
  find /tmp -name "raaghas_*" -type f -delete -print
  
  # Delete common redundant large files
  rm -f /var/www/raaghas_new/deploy.zip 2>/dev/null
  rm -f /var/www/raaghas_new/raaghas_prod.zip 2>/dev/null
  rm -f /var/www/raaghas_new/raaghas_nginx.conf.bak 2>/dev/null
  
  echo "✅ Archives and temp files purged."

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  3. Cleaning Logs"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Flush PM2 logs
  pm2 flush
  
  # Clear system journals older than 1 day
  journalctl --vacuum-time=1d
  
  # Clear application log files in apps/api/
  find /var/www/raaghas_new/apps/api -name "*.log" -type f -delete -print
  
  echo "✅ Logs cleared."

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  4. NPM & System Cache"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Clean apt cache
  apt-get clean
  
  # Clean npm cache
  npm cache clean --force 2>/dev/null || true
  
  echo "✅ Cache cleaned."

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  5. Final Disk Usage"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  df -h /
REMOTE

echo ""
echo "🏁 Deep cleanup complete."
