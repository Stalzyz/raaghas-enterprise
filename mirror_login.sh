#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — LOGIN LOGIC MIRROR (Diagnostic)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

VPS_IP="72.61.231.187"
ADMIN_EMAIL="admin@raaghas.in"
ADMIN_PASS="RaaghasAdmin2024!"

echo "🔍 Mirroring Login Logic on VPS..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << REMOTE
  cd /var/www/raaghas_new
  
  DB_URL="postgresql://raaghas_user:RaaghasProd2024@127.0.0.1:5432/raaghas_db"

  cat > login_mirror.js << 'EOF'
const { PrismaClient } = require('./packages/database/generated-client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DB_URL
});

async function test() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASS;
  
  console.log('--- Diagnostic Start ---');
  console.log('📧 Testing Email:', email);
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error('❌ FAIL: User not found in database!');
    return;
  }
  
  console.log('✅ User found in DB.');
  console.log('🔑 DB Hash (Start):', user.password.substring(0, 10), '...');
  
  const isMatch = await bcrypt.compare(pass, user.password);
  
  if (isMatch) {
    console.log('✅ SUCCESS: Password matches hash in database!');
  } else {
    console.error('❌ FAIL: Password does NOT match hash in database.');
    console.log('💡 Note: This usually means the hash was mangled or generated with a different salt/version.');
  }
}

test()
  .catch(e => console.error('❌ ERROR:', e.message))
  .finally(() => prisma.\$disconnect());
EOF

  DB_URL="\$DB_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" \
  NODE_PATH=".:./node_modules:./apps/api/node_modules" node login_mirror.js
  
  rm login_mirror.js
REMOTE
