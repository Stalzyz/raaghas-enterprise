import { PrismaClient } from './generated-client';
const prisma = new PrismaClient();
async function run() {
  await prisma.discount.updateMany({
    where: { code: 'WELCOME-10%OFF' },
    data: { endDate: new Date('2027-12-31T00:00:00.000Z') }
  });
  console.log("Updated WELCOME-10%OFF end date");
}
run().finally(() => prisma.$disconnect());
