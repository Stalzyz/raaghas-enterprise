import { PrismaClient, UserRole, OrderStatus, Prisma } from '@raaghas/database';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({});

async function main() {
  console.log('🚀 Starting Enterprise Data Seeding...');

  // ─── PHASE 1: USERS ────────────────────────────────────────────────────────
  console.log('👥 Seeding Users...');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@raaghas.com' },
    update: {},
    create: {
      email: 'admin@raaghas.com',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      password: 'Admin123', // In real life, hash this!
      phone: '9876543210',
    },
  });

  const customers = [
    { email: 'user1@test.com', name: 'Arjun Mehta', phone: '9123456781' },
    { email: 'user2@test.com', name: 'Priya Sharma', phone: '9123456782' },
    { email: 'user3@test.com', name: 'Vikram Singh', phone: '9123456783' },
  ];

  const seededCustomers = [];
  for (const c of customers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        ...c,
        role: UserRole.CUSTOMER,
        savedAddresses: [
          {
            name: c.name,
            street: '123 Test Lane',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            country: 'India',
            isDefault: true,
          }
        ],
      },
    });
    seededCustomers.push(user);
  }

  // ─── PHASE 2: PRODUCTS ─────────────────────────────────────────────────────
  console.log('🛍️ Seeding Products & Inventory...');
  
  const productData = [
    {
      title: 'Ethical Silk Saree - Midnight Blue',
      handle: 'midnight-blue-silk-saree',
      category: 'Sarees',
      hsnCode: '5007',
      status: 'PUBLISHED',
      published: true,
      variants: [
        { sku: 'SR-MID-BLU-01', price: 12500, inventory: 15, option1Name: 'Size', option1Value: 'Standard' }
      ]
    },
    {
      title: 'Handloom Cotton Kurta - Sage Green',
      handle: 'sage-green-cotton-kurta',
      category: 'Menswear',
      hsnCode: '6205',
      status: 'PUBLISHED',
      published: true,
      variants: [
        { sku: 'KT-SGE-GRN-S', price: 2499, inventory: 20, option1Name: 'Size', option1Value: 'S' },
        { sku: 'KT-SGE-GRN-M', price: 2499, inventory: 0, option1Name: 'Size', option1Value: 'M' } // OUT OF STOCK
      ]
    },
    {
      title: 'Zari Border Banarasi Saree',
      handle: 'banarasi-zari-saree',
      category: 'Sarees',
      hsnCode: '5007',
      status: 'PUBLISHED',
      published: true,
      variants: [
        { sku: 'SR-BAN-ZAR-01', price: 45000, inventory: 2, option1Name: 'Size', option1Value: 'Standard' } // LOW STOCK
      ]
    },
    {
      title: 'Linen Blend Trousers - Sand',
      handle: 'sand-linen-trousers',
      category: 'Menswear',
      hsnCode: '6203',
      status: 'PUBLISHED',
      published: true,
      variants: [
        { sku: 'TR-SND-32', price: 3499, inventory: 10, option1Name: 'Size', option1Value: '32' },
        { sku: 'TR-SND-34', price: 3499, inventory: 4, option1Name: 'Size', option1Value: '34' } // LOW STOCK
      ]
    }
  ];

  const seededProducts = [];
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { handle: p.handle },
      update: {},
      create: {
        title: p.title,
        handle: p.handle,
        category: p.category,
        hsnCode: p.hsnCode,
        status: p.status,
        published: p.published,
        variants: {
          create: p.variants.map(v => ({
            sku: v.sku,
            price: new Prisma.Decimal(v.price),
            sellingPrice: new Prisma.Decimal(v.price),
            inventory: v.inventory,
            option1Name: v.option1Name,
            option1Value: v.option1Value
          }))
        }
      },
      include: { variants: true }
    });
    seededProducts.push(product);
  }

  // ─── PHASE 3: ORDERS & INVOICES ───────────────────────────────────────────
  console.log('💳 Generating Test Orders & Invoices...');
  
  const orderScenarios = [
    { user: seededCustomers[0], status: OrderStatus.CONFIRMED, payment: 'PAID' },
    { user: seededCustomers[1], status: OrderStatus.PAYMENT_PENDING, payment: 'PENDING' },
    { user: seededCustomers[2], status: OrderStatus.FAILED, payment: 'FAILED' },
    { user: seededCustomers[0], status: OrderStatus.DELIVERED, payment: 'PAID' },
    { user: seededCustomers[1], status: OrderStatus.CONFIRMED, payment: 'PAID' },
  ];

  for (let i = 0; i < orderScenarios.length; i++) {
    const sc = orderScenarios[i];
    const product = seededProducts[i % seededProducts.length];
    const variant = product.variants[0];
    
    const subtotal = Number(variant.price);
    const taxes = subtotal * 0.12; // 12% GST
    const shipping = 100;
    const total = subtotal + taxes + shipping;

    const order = await prisma.order.create({
      data: {
        userId: sc.user.id,
        status: sc.status,
        financialStatus: sc.payment === 'PAID' ? 'paid' : 'pending',
        totalAmount: new Prisma.Decimal(total),
        subtotal: new Prisma.Decimal(subtotal),
        taxes: new Prisma.Decimal(taxes),
        shipping: new Prisma.Decimal(shipping),
        customerName: sc.user.name!,
        customerEmail: sc.user.email,
        customerPhone: sc.user.phone!,
        shippingAddress: (sc.user.savedAddresses as any)[0],
        billingAddress: (sc.user.savedAddresses as any)[0],
        paymentMethod: 'RAZORPAY',
        paymentId: sc.payment === 'PAID' ? `pay_test_${Math.random().toString(36).substr(2, 9)}` : null,
        items: {
          create: [
            {
              variantId: variant.id,
              quantity: 1,
              price: variant.price,
              hsnCode: product.hsnCode
            }
          ]
        }
      }
    });

    if (sc.payment === 'PAID') {
      const invNum = `INV-${new Date().getFullYear()}-${1000 + i}`;
      await prisma.invoice.create({
        data: {
          invoiceNumber: invNum,
          referenceId: order.id,
          referenceType: 'RETAIL',
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          status: 'PAID',
          subtotal: order.subtotal!,
          taxAmount: order.taxes!,
          totalAmount: order.totalAmount,
          amountPaid: order.totalAmount,
          tableData: [
            {
              item: product.title,
              sku: variant.sku,
              hsn: product.hsnCode,
              qty: 1,
              rate: variant.price,
              amount: variant.price
            }
          ],
          customFields: {
            orderDate: order.createdAt,
            shippingMethod: 'Express'
          }
        }
      });
      console.log(`✅ Generated Invoice ${invNum} for Order ${order.id}`);
    }
  }

  console.log('✨ Seeding Complete! System ready for testing.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
