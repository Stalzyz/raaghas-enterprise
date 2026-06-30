const { PrismaClient } = require('@raaghas/database');
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.discount.findFirst();
  console.log("Coupon id:", c?.id);
  const r = await prisma.offerRule.findFirst();
  console.log("Rule id:", r?.id);
}
run();
