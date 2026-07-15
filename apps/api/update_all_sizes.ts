import { PrismaClient } from './generated-client';
const prisma = new PrismaClient();

async function run() {
  const variants = await prisma.variant.findMany();
  let updatedCount = 0;

  for (const v of variants) {
    let changed = false;
    let data: any = {};

    const normalize = (val: any) => {
      if (!val) return null;
      const upper = val.toString().toUpperCase().trim();
      
      if (upper.startsWith('S-') || upper.startsWith('S -') || upper === 'S') return 'S';
      if (upper.startsWith('M-') || upper.startsWith('M -') || upper === 'M') return 'M';
      if (upper.startsWith('L-') || upper.startsWith('L -') || upper === 'L') return 'L';
      if (upper.startsWith('XL-') || upper.startsWith('XL -') || upper === 'XL') return 'XL';
      if (upper.startsWith('XXL-') || upper.startsWith('XXL -') || upper === 'XXL') return 'XXL';
      if (upper.startsWith('3XL-') || upper.startsWith('3XL -') || upper.startsWith('XXXL-') || upper.startsWith('XXXL -') || upper === '3XL' || upper === 'XXXL') return 'XXXL';

      return null;
    };

    const update1 = normalize(v.option1Value);
    if (update1 && update1 !== v.option1Value) {
      data.option1Value = update1;
      changed = true;
    }

    const update2 = normalize(v.option2Value);
    if (update2 && update2 !== v.option2Value) {
      data.option2Value = update2;
      changed = true;
    }

    const update3 = normalize(v.option3Value);
    if (update3 && update3 !== v.option3Value) {
      data.option3Value = update3;
      changed = true;
    }

    if (changed) {
      await prisma.variant.update({ where: { id: v.id }, data });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} variants for all sizes.`);
}

run().finally(() => prisma.$disconnect());
