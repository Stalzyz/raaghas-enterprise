import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { handle: { startsWith: 'premium-wear270' } },
    include: { variants: true }
  });
  
  for (const p of products) {
    console.log(`Product: ${p.handle}`);
    for (const v of p.variants) {
      console.log(`  Variant: ${v.sku} - Size: ${v.option1Value}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
