const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const product = await prisma.product.findFirst({ where: { handle: 'premium-wear37261' } });
  if (!product) { console.log('Product not found'); return; }
  console.log('Product found:', product.id);
  
  await prisma.image.deleteMany({ where: { productId: product.id } });
  await prisma.image.createMany({
    data: [
      {
        url: '/uploads/99b2f9e40fcb98d521cc51ac108f416ed.webp',
        position: 0,
        productId: product.id,
        altText: 'Premium Dupion Silk Kurti with Lining - 1'
      }
    ]
  });
  console.log('Images created!');
  const images = await prisma.image.findMany({ where: { productId: product.id } });
  console.log(images);
}
main().catch(console.error).finally(() => prisma.$disconnect());
