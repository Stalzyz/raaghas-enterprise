import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.emailTemplate.findMany();
  for (const t of templates) {
    if (t.body.includes('Raaghas Pvt Ltd | Salem, India')) {
      const updatedBody = t.body.replace(/Raaghas Pvt Ltd \| Salem, India/g, '{{store.storeName}} | {{store.businessAddress}}');
      await prisma.emailTemplate.update({
        where: { id: t.id },
        data: { body: updatedBody }
      });
      console.log(`Updated template ${t.name}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
