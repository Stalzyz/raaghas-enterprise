import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const variants = await prisma.productVariant.findMany({
    select: { id: true, option1Value: true, option2Value: true }
  });
  const sizes = new Set<string>();
  variants.forEach((v: any) => {
    if (v.option1Value) sizes.add(v.option1Value);
    if (v.option2Value) sizes.add(v.option2Value);
  });
  console.log(Array.from(sizes).filter(s => s.toUpperCase().includes('XXL')));
}
run().finally(() => prisma.$disconnect());
