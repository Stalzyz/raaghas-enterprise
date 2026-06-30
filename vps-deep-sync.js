const { PrismaClient } = require('../../packages/database/generated-client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UPLOADS_DIR = '/var/www/raaghas_new/shared/uploads';
const BASE_URL = 'https://api.raaghas.in/uploads';

async function syncMedia() {
  console.log('🔍 Starting DEEP Media Database Sync...');
  try {
    // 1. Fix Media Gallery
    const mediaItems = await prisma.media.findMany();
    for (const item of mediaItems) {
      const webp = item.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const hasOriginal = fs.existsSync(path.join(UPLOADS_DIR, item.filename));
      const hasWebp = fs.existsSync(path.join(UPLOADS_DIR, webp));
      
      if (hasOriginal === false && hasWebp === true) {
        console.log(`✨ Media: ${item.filename} -> ${webp}`);
        await prisma.media.update({
          where: { id: item.id },
          data: { filename: webp, url: `${BASE_URL}/${webp}`, mimeType: 'image/webp' }
        });
      }
    }

    // 2. Fix Product/Review Images
    const images = await prisma.image.findMany();
    for (const img of images) {
      const filename = path.basename(img.url);
      const webp = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const hasOriginal = fs.existsSync(path.join(UPLOADS_DIR, filename));
      const hasWebp = fs.existsSync(path.join(UPLOADS_DIR, webp));

      if (hasOriginal === false && hasWebp === true) {
        console.log(`✨ Image: ${filename} -> ${webp}`);
        await prisma.image.update({
          where: { id: img.id },
          data: { url: img.url.replace(filename, webp) }
        });
      }
    }

    // 3. Fix CMS Content
    const sections = await prisma.section.findMany();
    for (const sec of sections) {
      let contentStr = JSON.stringify(sec.content);
      if (contentStr.includes('/uploads/')) {
        const newContentStr = contentStr.replace(/\/uploads\/([^"'\s)]+)\.(jpg|jpeg|png)/gi, '/uploads/$1.webp');
        if (contentStr !== newContentStr) {
          console.log(`✨ Section Content Fixed: ${sec.id}`);
          await prisma.section.update({ where: { id: sec.id }, data: { content: JSON.parse(newContentStr) } });
        }
      }
    }

    console.log('✅ Deep Sync Successful.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncMedia();
