import { PrismaClient } from './generated-client';
const prisma = new PrismaClient();
async function run() {
  const rules = await prisma.offerRule.findMany();
  console.log("Offer rules:", rules);
}
run().finally(() => prisma.$disconnect());
