import { PrismaClient } from '@raaghas/database';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const UPLOADS_DIR = '/var/www/raaghas_new/shared/uploads';
const BASE_URL = 'https://api.raaghas.in/uploads';

async function syncMedia() {
  console.log('🔍 Starting Media Database Sync...');
  
  const mediaItems = await prisma.media.findMany();
  let updatedCount = 0;

  for (const item of mediaItems) {
    const currentPath = path.join(UPLOADS_DIR, item.filename);
    
    // If file doesn't exist, try finding the webp version
    if (!fs.existsSync(currentPath)) {
      const ext = path.extname(item.filename);
      const nameWithoutExt = path.basename(item.filename, ext);
      const webpFilename = `${nameWithoutExt}.webp`;
      const webpPath = path.join(UPLOADS_DIR, webpFilename);

      if (fs.existsSync(webpPath)) {
        console.log(`✨ Fixing: ${item.filename} -> ${webpFilename}`);
        
        await prisma.media.update({
          where: { id: item.id },
          data: {
            filename: webpFilename,
            url: `${BASE_URL}/${webpFilename}`,
            mimeType: 'image/webp'
          }
        });
        updatedCount++;
      } else {
        console.warn(`⚠️  Missing file: ${item.filename} (No webp alternative found)`);
      }
    }
  }

  console.log(`✅ Sync Complete. Updated ${updatedCount} records.`);
}

syncMedia()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
