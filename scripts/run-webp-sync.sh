#!/bin/bash
# ═══════════════════════════════════════════════════════
#  RAAGHAS: SURGICAL WEBP SYNC — Run this ON the VPS
# ═══════════════════════════════════════════════════════
set -e

RELEASE_DIR=$(readlink -f /var/www/raaghas_new/current)
API_DIR="$RELEASE_DIR/apps/api"
UPLOADS_DIR="/var/www/raaghas_new/shared/uploads"
BASE_URL="https://api.raaghas.in/uploads"
SCRIPT="$API_DIR/___webp_sync___.js"

echo "🔍 Release Dir: $RELEASE_DIR"
echo "🔍 API Dir: $API_DIR"

# Find the exact @prisma/client path in this monorepo
PRISMA_CLIENT_PATH=$(node -e "
  const paths = [
    '$RELEASE_DIR/node_modules/@prisma/client',
    '$API_DIR/node_modules/@prisma/client',
    '$RELEASE_DIR/packages/database/node_modules/@prisma/client',
  ];
  const fs = require('fs');
  for (const p of paths) {
    if (fs.existsSync(p)) { console.log(p); process.exit(0); }
  }
  // Fallback: search
  const { execSync } = require('child_process');
  const result = execSync('find $RELEASE_DIR/node_modules -name \"client.js\" -path \"*/@prisma/client*\" 2>/dev/null | head -1').toString().trim();
  if (result) { console.log(require('path').dirname(result)); process.exit(0); }
  console.log('NOT_FOUND');
")

echo "🔍 Prisma client path: $PRISMA_CLIENT_PATH"

if [ "$PRISMA_CLIENT_PATH" = "NOT_FOUND" ]; then
  echo "❌ Cannot find @prisma/client. Running prisma generate..."
  cd "$API_DIR" && npx prisma generate
  PRISMA_CLIENT_PATH="$RELEASE_DIR/node_modules/@prisma/client"
fi

# Write the sync script directly into the API folder (so require resolves correctly)
cat > "$SCRIPT" << JSEOF
const { PrismaClient } = require('$PRISMA_CLIENT_PATH');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UPLOADS_DIR = '$UPLOADS_DIR';
const BASE_URL = '$BASE_URL';

async function run() {
  console.log('🧪 Running Deep WebP Sync...');
  let fixed = 0;
  try {
    // --- 1. Media Table ---
    const mediaItems = await prisma.media.findMany();
    for (const item of mediaItems) {
      const webp = item.filename.replace(/\\.(jpg|jpeg|png)$/i, '.webp');
      const hasOriginal = fs.existsSync(path.join(UPLOADS_DIR, item.filename));
      const hasWebp = fs.existsSync(path.join(UPLOADS_DIR, webp));
      if (!hasOriginal && hasWebp) {
        await prisma.media.update({
          where: { id: item.id },
          data: { filename: webp, url: BASE_URL + '/' + webp, mimeType: 'image/webp' }
        });
        console.log('✨ Media: ' + item.filename + ' -> ' + webp);
        fixed++;
      }
    }

    // --- 2. Image Table ---
    const images = await prisma.image.findMany();
    for (const img of images) {
      const filename = path.basename(img.url);
      const webp = filename.replace(/\\.(jpg|jpeg|png)$/i, '.webp');
      const hasOriginal = fs.existsSync(path.join(UPLOADS_DIR, filename));
      const hasWebp = fs.existsSync(path.join(UPLOADS_DIR, webp));
      if (!hasOriginal && hasWebp) {
        await prisma.image.update({ where: { id: img.id }, data: { url: img.url.replace(filename, webp) } });
        console.log('✨ Image: ' + filename + ' -> ' + webp);
        fixed++;
      }
    }

    // --- 3. CMS Sections (JSON content) ---
    const sections = await prisma.section.findMany();
    for (const sec of sections) {
      let contentStr = JSON.stringify(sec.content);
      if (contentStr.includes('/uploads/')) {
        const newStr = contentStr.replace(/\/uploads\/([^"'\\s)]+)\\.(jpg|jpeg|png)/gi, '/uploads/$1.webp');
        if (contentStr !== newStr) {
          await prisma.section.update({ where: { id: sec.id }, data: { content: JSON.parse(newStr) } });
          console.log('✨ Section JSON fixed: ' + sec.id);
          fixed++;
        }
      }
    }

    console.log('');
    console.log('✅ Done. Fixed ' + fixed + ' records.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('did not initialize')) {
      console.log('💡 Fix: cd $API_DIR && npx prisma generate, then re-run this script.');
    }
  } finally {
    await prisma.$disconnect();
  }
}
run();
JSEOF

echo "🚀 Running sync script from inside API directory..."
cd "$API_DIR" && node "___webp_sync___.js"

echo "🧹 Cleaning up..."
rm -f "$SCRIPT"
