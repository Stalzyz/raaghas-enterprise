const { PrismaClient } = require('@raaghas/database');
const prisma = new PrismaClient();
async function main() {
  const zones = await prisma.shippingZone.findMany({ select: { name: true, regions: true } });
  console.log(JSON.stringify(zones, null, 2));
}
main().finally(() => prisma.$disconnect());
