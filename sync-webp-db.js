const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// We use the PrismaClient directly from node_modules since it's already generated
const prisma = new PrismaClient();
const UPLOADS_DIR = '/var/www/raaghas_new/shared/uploads';
const BASE_URL = 'https://api.raaghas.in/uploads';

async function syncMedia() {
  console.log('🔍 Starting DEEP Media Database Sync...');
  
  try {
    // 1. Fix the Media Table
    const mediaItems = await prisma.media.findMany();
    for (const item of mediaItems) {
      if (!fs.existsSync(path.join(UPLOADS_DIR, item.filename))) {
        const webp = item.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        if (fs.existsSync(path.join(UPLOADS_DIR, webp))) {
          console.log(`✨ Media Table: ${item.filename} -> ${webp}`);
          await prisma.media.update({
            where: { id: item.id },
            data: { filename: webp, url: `${BASE_URL}/${webp}`, mimeType: 'image/webp' }
          });
        }
      }
    }

    // 2. Fix the Image Table (Product/Variant/Review images)
    const images = await prisma.image.findMany();
    for (const img of images) {
      if (img.url.includes('/uploads/')) {
        const filename = path.basename(img.url);
        if (!fs.existsSync(path.join(UPLOADS_DIR, filename))) {
          const webp = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          if (fs.existsSync(path.join(UPLOADS_DIR, webp))) {
            console.log(`✨ Image Table: ${filename} -> ${webp}`);
            await prisma.image.update({
              where: { id: img.id },
              data: { url: img.url.replace(filename, webp) }
            });
          }
        }
      }
    }

    // 3. Fix Collection Banners
    const collections = await prisma.collection.findMany({ where: { image: { contains: '/uploads/' } } });
    for (const col of collections) {
      const filename = path.basename(col.image);
      const webp = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (fs.existsSync(path.join(UPLOADS_DIR, webp))) {
         await prisma.collection.update({ where: { id: col.id }, data: { image: col.image.replace(filename, webp) } });
      }
    }

    // 4. Fix CMS Sections (The JSON content)
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

    console.log(`✅ Deep Sync Complete.`);
  } catch (err) {
    console.error('❌ Sync Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncMedia();
