#!/usr/bin/expect -f
# Full VPS Recovery Script for raaghas.in

set timeout 600
set VPS_IP "72.61.231.187"
set VPS_PASS "Photoshop09@"

log_user 1

# ─── OPEN SSH CONNECTION ────────────────────────────────────────────────────
spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=20 root@$VPS_IP

expect {
    "password:" { send "$VPS_PASS\r" }
    "yes/no"    { send "yes\r"; expect "password:"; send "$VPS_PASS\r" }
    timeout     { puts "TIMEOUT connecting"; exit 1 }
}

expect "# " { send "echo '✅ SSH CONNECTED'\r" }

# ─── PHASE 1: DIAGNOSTICS ──────────────────────────────────────────────────
expect "# " { send "node -v; npm -v; pm2 list 2>&1 | head -40\r" }

# ─── PHASE 2: DNS / NETWORK FIX ────────────────────────────────────────────
expect "# " {
    send {echo "nameserver 8.8.8.8
nameserver 1.1.1.1" > /etc/resolv.conf && echo "✅ DNS FIXED"}
    send "\r"
}
expect "# " { send "ping -c 2 registry.npmjs.org && echo '✅ NETWORK OK'\r" }

# ─── PHASE 3: UPGRADE NODE TO 20 ──────────────────────────────────────────
expect "# " {
    send {curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs && echo '✅ NODE 20 INSTALLED'}
    send "\r"
}
expect -timeout 120 "✅ NODE 20 INSTALLED"

expect "# " { send "node -v && npm -v\r" }

# ─── PHASE 4: FIX NPM PERMISSIONS ──────────────────────────────────────────
expect "# " { send "chown -R root:root ~/.npm; npm cache clean --force; echo '✅ NPM CACHE CLEAN'\r" }

# ─── PHASE 5: LOCATE PROJECT ────────────────────────────────────────────────
expect "# " {
    send {PROJ=$(ls -d /var/www/raaghas_new/current /var/www/raaghas/current /root/raaghas /var/www/current 2>/dev/null | head -1); echo "PROJECT: $PROJ"}
    send "\r"
}
expect "# " { send "ls /var/www/ 2>/dev/null; ls /root/ 2>/dev/null | head -20\r" }

# ─── PHASE 6: CLEAN INSTALL ─────────────────────────────────────────────────
expect "# " {
    send {cd $(ls -d /var/www/raaghas_new/current /var/www/raaghas/current 2>/dev/null | head -1) 2>/dev/null || echo "LOCATING..."}
    send "\r"
}
expect "# " { send "pwd && ls\r" }

expect "# " {
    send {find /var/www /root -name "package.json" -maxdepth 5 -not -path "*/node_modules/*" 2>/dev/null | head -10}
    send "\r"
}

# ─── PHASE 7: PM2 STATUS ────────────────────────────────────────────────────
expect "# " { send "pm2 list\r" }
expect "# " { send "pm2 logs --nostream --lines 30 2>&1\r" }

# ─── PHASE 8: CHECK NGINX ───────────────────────────────────────────────────
expect "# " { send "systemctl status nginx | head -20\r" }
expect "# " { send "nginx -t 2>&1\r" }

# ─── DONE ───────────────────────────────────────────────────────────────────
expect "# " { send "echo '=== DIAGNOSTIC COMPLETE ==='\r" }
expect "# " { send "exit\r" }
expect eof
