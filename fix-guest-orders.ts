import { PrismaClient } from '@raaghas/database';

const prisma = new PrismaClient();

async function fixGuestOrders() {
  console.log('Fixing guest orders...');
  
  // Find all orders without a userId
  const guestOrders = await prisma.order.findMany({
    where: { userId: null },
    select: { id: true, customerEmail: true, customerName: true, customerPhone: true }
  });
  
  console.log(`Found ${guestOrders.length} guest orders without userId.`);
  
  for (const order of guestOrders) {
    if (!order.customerEmail) continue;
    
    const email = order.customerEmail.toLowerCase().trim();
    
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log(`Creating user for ${email}...`);
      user = await prisma.user.create({
        data: {
          email,
          name: order.customerName || 'Guest Customer',
          phone: order.customerPhone || '',
          role: 'CUSTOMER',
          wallet: { create: { balance: 0 } }
        }
      });
    }
    
    console.log(`Linking order ${order.id} to user ${user.id}...`);
    await prisma.order.update({
      where: { id: order.id },
      data: { userId: user.id }
    });
  }
  
  console.log('Done!');
  await prisma.$disconnect();
}

fixGuestOrders().catch(console.error);
