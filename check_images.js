const { PrismaClient } = require('./packages/database/generated-client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    take: 5,
    include: { images: true }
  });
  console.log(JSON.stringify(products, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
