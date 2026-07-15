const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas' } } });
async function main() {
  const settings = await prisma.storeSettings.findFirst();
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
