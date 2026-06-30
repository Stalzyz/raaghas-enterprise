const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Path to the generated Prisma client on the VPS
const targetClientPath = path.join('/var/www/raaghas_new', 'packages/database/generated-client');

if (!fs.existsSync(targetClientPath)) {
  console.error("❌ ERROR: Generated client folder does NOT exist at " + targetClientPath);
  process.exit(1);
}

const { PrismaClient } = require(targetClientPath);
const prisma = new PrismaClient();

async function main() {
  console.log('☢️  Starting Nuclear Seed V2...');

  // 1. CLEANUP (Careful: Nuclear reset)
  console.log('🧹 Cleaning existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.orderActivity.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  const hashedPass = await bcrypt.hash('Admin123', 10);
  const customerPass = await bcrypt.hash('Customer123', 10);

  // 2. CREATE USERS
  console.log('👤 Creating Users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@raaghas.com',
      password: hashedPass,
      name: 'Master Admin',
      role: 'ADMIN'
    }
  });

  const customers = [
    { name: 'Priya Sharma', email: 'priya@test.com', phone: '9876543210' },
    { name: 'Anita Verma', email: 'anita@test.com', phone: '9876543211' },
    { name: 'Kavya Nair', email: 'kavya@test.com', phone: '9876543212' }
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const user = await prisma.user.create({
      data: {
        ...c,
        password: customerPass,
        role: 'CUSTOMER',
        savedAddresses: [
          {
            type: 'SHIPPING',
            street: '123 Test Lane',
            city: 'Chennai',
            state: 'Tamil Nadu',
            zip: '600001',
            country: 'India',
            isDefault: true
          }
        ],
        wallet: { create: { balance: 500 } }
      }
    });
    createdCustomers.push(user);
  }

  // 3. CREATE COLLECTIONS
  console.log('📂 Creating Collections...');
  const collections = [
    { title: 'Kurtis', handle: 'kurtis' },
    { title: 'Tops', handle: 'tops' },
    { title: 'Chudiar Sets', handle: 'chudiar-sets' },
    { title: 'Kalamkari', handle: 'kalamkari' }
  ];

  const createdCols = {};
  for (const col of collections) {
    createdCols[col.handle] = await prisma.collection.create({ data: col });
  }

  // 4. CREATE PRODUCTS (20 products)
  console.log('🛍️ Creating 20 Products...');
  const productTemplates = [
    { title: 'Floral Silk Kurti', handle: 'floral-silk-kurti', cat: 'kurtis', price: 1899, mrp: 2499 },
    { title: 'Embroidered Cotton Top', handle: 'embroidered-cotton-top', cat: 'tops', price: 999, mrp: 1299 },
    { title: 'Royal Chudiar Set', handle: 'royal-chudiar-set', cat: 'chudiar-sets', price: 3499, mrp: 4999 },
    { title: 'Hand-painted Kalamkari', handle: 'hand-painted-kalamkari', cat: 'kalamkari', price: 4500, mrp: 5500 },
    { title: 'Daily Wear Kurti', handle: 'daily-wear-kurti', cat: 'kurtis', price: 799, mrp: 999 },
    { title: 'Summer Breeze Top', handle: 'summer-breeze-top', cat: 'tops', price: 699, mrp: 899 },
    { title: 'Bridal Chudiar', handle: 'bridal-chudiar', cat: 'chudiar-sets', price: 8999, mrp: 12000 },
    { title: 'Classic Kalamkari Saree', handle: 'classic-kalamkari-saree', cat: 'kalamkari', price: 5500, mrp: 7500 },
    { title: 'Indigo Print Kurti', handle: 'indigo-print-kurti', cat: 'kurtis', price: 1299, mrp: 1599 },
    { title: 'Linen Office Top', handle: 'linen-office-top', cat: 'tops', price: 1499, mrp: 1899 },
    { title: 'Ethnic Party Set', handle: 'ethnic-party-set', cat: 'chudiar-sets', price: 4200, mrp: 5500 },
    { title: 'Modern Kalamkari Tunic', handle: 'modern-kalamkari-tunic', cat: 'kalamkari', price: 2800, mrp: 3500 },
    { title: 'Gold Leaf Kurti', handle: 'gold-leaf-kurti', cat: 'kurtis', price: 2999, mrp: 3999 },
    { title: 'Denim Fusion Top', handle: 'denim-fusion-top', cat: 'tops', price: 1100, mrp: 1500 },
    { title: 'Velvet Dream Set', handle: 'velvet-dream-set', cat: 'chudiar-sets', price: 6500, mrp: 8500 },
    { title: 'Ancient Art Kurti', handle: 'ancient-art-kurti', cat: 'kalamkari', price: 3100, mrp: 4000 },
    { title: 'Pastel Love Kurti', handle: 'pastel-love-kurti', cat: 'kurtis', price: 1500, mrp: 1999 },
    { title: 'Boho Chic Top', handle: 'boho-chic-top', cat: 'tops', price: 850, mrp: 1100 },
    { title: 'Sapphire Chudiar', handle: 'sapphire-chudiar', cat: 'chudiar-sets', price: 5200, mrp: 6800 },
    { title: 'Earth Tones Kalamkari', handle: 'earth-tones-kalamkari', cat: 'kalamkari', price: 3900, mrp: 4800 }
  ];

  for (let i = 0; i < productTemplates.length; i++) {
    const t = productTemplates[i];
    // Stock Logic: 3 OUT OF STOCK, 3 LOW STOCK, Rest normal
    let inventory = 50;
    if (i < 3) inventory = 0;
    else if (i < 6) inventory = 3;

    await prisma.product.create({
      data: {
        title: t.title,
        handle: t.handle,
        vendor: 'Raaghas',
        category: t.cat,
        published: true,
        status: 'PUBLISHED',
        hsnCode: '6204',
        images: {
          create: [{ url: `https://picsum.photos/seed/${t.handle}/800/1000`, altText: t.title }]
        },
        variants: {
          create: [
            { option1Name: 'Size', option1Value: 'S', sku: `SKU-${t.handle}-S`, price: t.price, mrp: t.mrp, inventory: inventory },
            { option1Name: 'Size', option1Value: 'M', sku: `SKU-${t.handle}-M`, price: t.price, mrp: t.mrp, inventory: inventory },
            { option1Name: 'Size', option1Value: 'L', sku: `SKU-${t.handle}-L`, price: t.price, mrp: t.mrp, inventory: inventory }
          ]
        },
        collections: { connect: { id: createdCols[t.cat].id } }
      }
    });
  }

  // 5. SIMULATE ORDERS
  console.log('📦 Simulating Orders...');
  
  // Order 1: Success for Priya
  const priya = createdCustomers[0];
  const variant1 = await prisma.variant.findFirst({ where: { sku: 'SKU-floral-silk-kurti-M' } });
  
  const order1 = await prisma.order.create({
    data: {
      userId: priya.id,
      status: 'CONFIRMED',
      totalAmount: 1899,
      subtotal: 1695.54,
      taxes: 203.46, // 12% GST
      customerName: priya.name,
      customerEmail: priya.email,
      customerPhone: priya.phone,
      shippingAddress: priya.savedAddresses[0],
      paymentMethod: 'RAZORPAY',
      paymentId: 'pay_priya_123',
      items: {
        create: [{ variantId: variant1.id, quantity: 1, price: 1899, hsnCode: '6204' }]
      }
    }
  });

  // Create Invoice for Order 1
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-001',
      referenceId: order1.id,
      referenceType: 'RETAIL',
      customerName: priya.name,
      customerEmail: priya.email,
      customerPhone: priya.phone,
      status: 'PAID',
      subtotal: 1695.54,
      taxAmount: 203.46,
      totalAmount: 1899,
      tableData: [
        { name: 'Floral Silk Kurti', variant: 'Size: M', qty: 1, price: 1695.54, tax: 203.46, total: 1899, hsn: '6204' }
      ]
    }
  });

  // Order 2: Shipped for Kavya
  const kavya = createdCustomers[2];
  const variant2 = await prisma.variant.findFirst({ where: { sku: 'SKU-royal-chudiar-set-L' } });
  const order2 = await prisma.order.create({
    data: {
      userId: kavya.id,
      status: 'SHIPPED',
      totalAmount: 3499,
      customerName: kavya.name,
      customerEmail: kavya.email,
      customerPhone: kavya.phone,
      shippingAddress: kavya.savedAddresses[0],
      trackingId: 'TRACK123456',
      carrierName: 'Delhivery',
      items: {
        create: [{ variantId: variant2.id, quantity: 1, price: 3499, hsnCode: '6204' }]
      }
    }
  });

  console.log('✅ Nuclear Seed V2 Complete!');
}

main()
  .catch(e => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
