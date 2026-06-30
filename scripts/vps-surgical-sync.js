const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma directly using the default client in node_modules
const prisma = new PrismaClient();
const UPLOADS_DIR = '/var/www/raaghas_new/shared/uploads';
const BASE_URL = 'https://api.raaghas.in/uploads';

async function syncMedia() {
  console.log('🧪 Starting SURGICAL Media Sync...');
  try {
    // 1. Media Table
    const mediaItems = await prisma.media.findMany();
    for (const item of mediaItems) {
      const webp = item.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (!fs.existsSync(path.join(UPLOADS_DIR, item.filename)) && fs.existsSync(path.join(UPLOADS_DIR, webp))) {
        console.log(`✨ Fixing Media: ${item.filename}`);
        await prisma.media.update({
          where: { id: item.id },
          data: { filename: webp, url: `${BASE_URL}/${webp}`, mimeType: 'image/webp' }
        });
      }
    }

    // 2. Sections Table (The JSON Content)
    const sections = await prisma.section.findMany();
    for (const sec of sections) {
      let contentStr = JSON.stringify(sec.content);
      if (contentStr.includes('/uploads/')) {
        const newContentStr = contentStr.replace(/\/uploads\/([^"'\s)]+)\.(jpg|jpeg|png)/gi, '/uploads/$1.webp');
        if (contentStr !== newContentStr) {
          console.log(`✨ Fixing Section JSON: ${sec.id}`);
          await prisma.section.update({ where: { id: sec.id }, data: { content: JSON.parse(newContentStr) } });
        }
      }
    }

    // 3. Image Table
    const images = await prisma.image.findMany();
    for (const img of images) {
      const filename = path.basename(img.url);
      const webp = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (!fs.existsSync(path.join(UPLOADS_DIR, filename)) && fs.existsSync(path.join(UPLOADS_DIR, webp))) {
        console.log(`✨ Fixing Image Link: ${filename}`);
        await prisma.image.update({
          where: { id: img.id },
          data: { url: img.url.replace(filename, webp) }
        });
      }
    }

    console.log('✅ Surgical Sync Successful.');
  } catch (err) {
    console.error('❌ Error during sync:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncMedia();
