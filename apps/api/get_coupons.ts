import { PrismaClient } from './generated-client';
const prisma = new PrismaClient();
async function run() {
  const coupons = await prisma.discount.findMany();
  console.log(coupons);
}
run().finally(() => prisma.$disconnect());
