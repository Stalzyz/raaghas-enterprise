const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Wiping all products from database...");
  const res = await prisma.product.deleteMany({});
  console.log(`Deleted ${res.count} products.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
