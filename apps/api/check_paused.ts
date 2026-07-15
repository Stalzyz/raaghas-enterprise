import { PrismaClient } from './generated-client';
const prisma = new PrismaClient();
async function run() {
  const coupons = await prisma.discount.findMany({ where: { isActive: false } });
  console.log("Paused coupons:", coupons);
}
run().finally(() => prisma.$disconnect());
