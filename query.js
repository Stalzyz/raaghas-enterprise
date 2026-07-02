const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'global' } });
  console.log("Settings.maxCreditUsagePercent:", settings?.maxCreditUsagePercent);
}
main().catch(console.error).finally(() => prisma.$disconnect());
