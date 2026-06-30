import { PrismaClient } from '@raaghas/database';

const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({ where: { email: '2424541@gmail.com' } });
  console.log('User:', user);
  
  const order = await prisma.order.findFirst({ where: { customerEmail: '2424541@gmail.com' } });
  console.log('Order:', order);
  
  await prisma.$disconnect();
}

checkUser().catch(console.error);
