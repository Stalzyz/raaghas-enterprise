const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const handles = Array.from({length: 19}, (_, i) => `premium-wear2706${i + 1}`);
  const products = await prisma.product.findMany({
    where: { handle: { in: handles } },
    include: { variants: true }
  });
  for (const p of products) {
    console.log(`Product ${p.handle} has ${p.variants.length} variants:`);
    console.log(`  Sizes: ${p.variants.map(v => v.option1Value).join(', ')}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
