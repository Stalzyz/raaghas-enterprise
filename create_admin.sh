#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — ADMIN CREATION (Shielded v4)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
ADMIN_EMAIL="admin@raaghas.in"
ADMIN_PASS="RaaghasAdmin2024!"

echo "👤 PREPARING SHIELDED ADMIN INJECTION..."

# ─── 1. LOCAL HASHING & ENCODING ──────────────────────────────────────────────
echo "🔐 Hashing and encoding password locally..."
# We use Base64 to shield the hash from shell expansion characters ($)
RAW_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASS', 10));")
SAFE_HASH=$(echo -n "$RAW_HASH" | base64)

# ─── 2. REMOTE INJECTION ───────────────────────────────────────────────────────
echo "🚀 Injecting into VPS database..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  cd /var/www/raaghas_new
  
  # Target Database (Matches Nuclear Sync)
  DB_URL="postgresql://raaghas_user:Raaghas%40Prod2024@127.0.0.1:5432/raaghas"
  # Create the injection script
  # We use a quoted heredoc 'EOF' to prevent ANY expansion
  cat > inject_admin_v5.js << 'EOF'
const { PrismaClient } = require('./packages/database/generated-client');
const prisma = new PrismaClient({
  datasourceUrl: process.env.DB_URL
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  // Decode Base64 inside Node to avoid shell $ expansion
  const passwordHash = Buffer.from(process.env.ADMIN_HASH_B64, 'base64').toString();
  
  console.log('💉 Injecting user:', email);
  console.log('🧪 Hash preview:', passwordHash.substring(0, 10), '...');

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      role: 'ADMIN',
      name: 'Master Admin'
    },
    create: {
      email,
      password: passwordHash,
      role: 'ADMIN',
      name: 'Master Admin'
    }
  });
  
  console.log('✅ Success! User active in DB.');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
EOF

  # Run the script - pass the SAFE_HASH (Base64) which has NO $ signs
  DB_URL="\$DB_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_HASH_B64="$SAFE_HASH" \
  NODE_PATH=".:./node_modules:./apps/api/node_modules" node inject_admin_v5.js
  
  rm inject_admin_v5.js
REMOTE

echo ""
echo "🏁 Shielded Injection Complete."
echo "👉 Login: https://admin.raaghas.in/login"
echo "👉 User:  $ADMIN_EMAIL"
echo "👉 Pass:  $ADMIN_PASS"
