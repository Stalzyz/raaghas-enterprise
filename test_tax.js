const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst();
  console.log("Before:", p.taxRate);
  
  await prisma.product.update({
    where: { id: p.id },
    data: { taxRate: "18.00" }
  });
  
  const p2 = await prisma.product.findUnique({ where: { id: p.id } });
  console.log("After string update:", p2.taxRate);
  
  await prisma.product.update({
    where: { id: p.id },
    data: { taxRate: 12.00 }
  });
  
  const p3 = await prisma.product.findUnique({ where: { id: p.id } });
  console.log("After number update:", p3.taxRate);
}
main().finally(() => prisma.$disconnect());
