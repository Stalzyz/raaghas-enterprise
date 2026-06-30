#!/bin/bash

# --- Raaghas VPS Deep Clean Script ---
echo "🚀 Starting VPS Deep Clean..."

# 1. Clear Deployment Garbage
echo "📦 Clearing old deployment zips in /tmp..."
rm -f /tmp/*.zip
rm -rf /tmp/deploy_staging

# 2. Clear Nginx Logs (Keeps the last 24h, deletes the rest)
echo "🌐 Truncating Nginx logs..."
find /var/log/nginx -type f -name "*.log.*" -delete
find /var/log/nginx -type f -name "*.gz" -delete
# Truncate current logs to 0 instead of deleting them to keep file handles open
for f in /var/log/nginx/*.log; do 
    if [ -f "$f" ]; then
        > "$f"
    fi
done

# 3. System Log Cleanup
echo "📂 Cleaning system logs older than 7 days..."
find /var/log -type f -name "*.gz" -delete
find /var/log -type f -name "*.1" -delete
journalctl --vacuum-time=7d

# 4. Package Manager Cleanup
echo "🛠️ Cleaning APT cache..."
apt-get autoremove -y
apt-get clean

# 5. Docker Cleanup (Only if Docker is installed)
if command -v docker &> /dev/null; then
    echo "🐳 Cleaning unused Docker images and volumes..."
    docker system prune -af --volumes
fi

# 6. Find large files (Show top 10 biggest files over 50MB)
echo "🔍 Top 10 Largest Files Remaining:"
find / -type f -size +50M -exec du -h {} + 2>/dev/null | sort -rh | head -n 10

echo "✅ Clean up complete! Check disk space with 'df -h'"
