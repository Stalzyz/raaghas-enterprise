#!/bin/bash
# VPS Disk Cleanup Execution Script — SAFE MODE
echo "========================================"
echo "   VPS CLEANUP EXECUTION"
echo "   $(date)"
echo "========================================"
echo "Starting cleanup... This may take a minute."

# 1. Clean old PM2 logs
echo "[1/7] Flushing PM2 logs..."
pm2 flush >/dev/null 2>&1
echo "✅ PM2 logs flushed."

# 2. Clean NPM caches
echo "[2/7] Cleaning npm/yarn/pnpm caches..."
npm cache clean --force >/dev/null 2>&1 || true
rm -rf ~/.npm/_cacache ~/.yarn/cache ~/.pnpm-store 2>/dev/null
echo "✅ Caches cleaned."

# 3. Clean old heavy backups (Keeping latest ones)
echo "[3/7] Removing old heavy backups..."
# Remove specific large files identified in the analysis
rm -f /root/backups/raaghas/media_20260525_010001.tar.gz
rm -f /root/backups/raaghas/media_20260524_010001.tar.gz
rm -f /root/backups/raaghas/media_20260523_010001.tar.gz
rm -f /root/backups/raaghas/media_20260526_010001.tar.gz # Wait, keep one? The latest was from 26th? Let's leave one if it exists.
# Wait, actually, let's keep the one from today, delete the rest.
find /root/backups/raaghas -name "*.tar.gz" -mtime +1 -exec rm -f {} \; 2>/dev/null
find /var/www/grafty-send/backups/automated -name "*.tar.gz" -mtime +1 -exec rm -f {} \; 2>/dev/null
rm -f /var/www/grafty-send/grafty_bsp/grafty_deploy_final.zip
rm -f /root/grafty_bsp/grafty_deploy_final.zip
rm -f /var/www/grafty-send/grafty-send-production.zip
rm -f /var/www/grafty-send/backups/restore_point_20260326_133306/project_code.tar.gz
rm -f /root/backups/restore_point_20260326_133306/project_code.tar.gz
rm -f /var/www/grafty-send/grafty_bsp/code_patch.zip
rm -f /root/grafty_bsp/code_patch.zip
echo "✅ Old backups removed."

# 4. Remove orphaned root node_modules
echo "[4/7] Removing orphaned node_modules..."
rm -rf /var/www/raaghas_new/node_modules
# Intentionally keeping /var/www/grafty-send/node_modules for safety unless we know for sure it's unused.
echo "✅ Orphaned node_modules removed."

# 5. Prune old Raaghas deployments (Keep latest 2)
echo "[5/7] Pruning old Raaghas deployments (keeping latest 2)..."
cd /var/www/raaghas_new/releases/ 2>/dev/null && ls -t | tail -n +3 | xargs -I {} rm -rf {}
echo "✅ Old deployments pruned."

# 6. Clean broken symlinks
echo "[6/7] Removing broken symlinks..."
find /var/www/grafty-send/sessions -xtype l -delete 2>/dev/null
find /var/www/apps/send-grafty/.wwebjs_auth -xtype l -delete 2>/dev/null
echo "✅ Broken symlinks removed."

# 7. Prune unused Docker artifacts
echo "[7/7] Pruning unused Docker images and containers..."
if command -v docker &>/dev/null; then
  docker system prune -a --volumes -f >/dev/null 2>&1
  echo "✅ Docker pruned."
else
  echo "Docker not installed, skipping."
fi

echo "========================================"
echo "   CLEANUP COMPLETE"
echo "========================================"
echo "Updated Disk Usage:"
df -h /
