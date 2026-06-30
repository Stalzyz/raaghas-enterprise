const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const intents = await prisma.paymentIntent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(intents, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
