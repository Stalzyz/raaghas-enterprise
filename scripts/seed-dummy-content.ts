import { PrismaClient } from '@raaghas/database';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Dummy Content Seeding...');

  // 1. Create Dummy Customer
  const customerEmail = 'tester@raaghas.in';
  const hashedPass = await bcrypt.hash('RaaghasTest2024!', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: { password: hashedPass },
    create: {
      email: customerEmail,
      password: hashedPass,
      name: 'Test Tester',
      role: 'CUSTOMER'
    }
  });
  console.log('✅ Dummy Customer created:', customer.email);

  // 2. Create Live Test Collection
  const testCol = await prisma.collection.upsert({
    where: { handle: 'live-test' },
    update: {},
    create: { 
      handle: 'live-test', 
      title: 'Live Test Collection', 
      description: 'Exclusive products for platform validation.' 
    }
  });
  console.log('✅ Collection created: Live Test');

  // 3. Create Dummy Products
  const products = [
    {
      title: 'Midnight Velvet Saree',
      handle: 'midnight-velvet-saree',
      description: 'A premium velvet saree for live testing purposes.',
      price: 8999,
      sku: 'SKU-MIDNIGHT-VELVET'
    },
    {
      title: 'Emerald Silk Anarkali',
      handle: 'emerald-silk-anarkali',
      description: 'Hand-woven emerald silk anarkali set.',
      price: 12500,
      sku: 'SKU-EMERALD-SILK'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { handle: p.handle },
      update: {},
      create: {
        title: p.title,
        handle: p.handle,
        description: p.description,
        published: true,
        vendor: 'Raaghas',
        variants: {
          create: [{ 
            sku: p.sku, 
            price: p.price, 
            inventory: 10,
            title: 'Default'
          }]
        },
        collections: { connect: { id: testCol.id } }
      }
    });
    console.log(`✅ Product created: ${p.title}`);
  }

  // 4. Create a Sample Order
  const variants = await prisma.variant.findMany({
    where: { sku: { in: products.map(p => p.sku) } }
  });

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      status: 'PROCESSING',
      totalAmount: 21499,
      customerName: 'Test Tester',
      customerEmail: customerEmail,
      customerPhone: '1234567890',
      shippingAddress: { city: 'Bangalore', state: 'Karnataka', zip: '560001' },
      paymentStatus: 'PAID',
      items: {
        create: variants.map(v => ({
          variantId: v.id,
          quantity: 1,
          price: v.price
        }))
      }
    }
  });
  console.log('✅ Sample Order created:', order.orderNumber);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
