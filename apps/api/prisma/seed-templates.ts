import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: 'Order Confirmation',
      type: 'ORDER_PLACED',
      subject: 'Your Raaghas Order #{{order.id}} is Confirmed!',
      body: `<div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
  <h1 style="color: #701A31; text-align: center;">RAAGHAS</h1>
  <p>Dear {{customer.name}},</p>
  <p>Thank you for shopping with Raaghas. Your order <strong>#{{order.id}}</strong> has been successfully placed.</p>
  <div style="background: #fdfbf7; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <p style="margin:0; color: #555;"><strong>Order Total:</strong> ₹{{order.totalAmount}}</p>
    <p style="margin:5px 0 0; color: #555;"><strong>Date:</strong> {{order.date}}</p>
  </div>
  <p>We will notify you once your exquisite pieces are shipped.</p>
  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 12px;">
    {{store.storeName}} | {{store.businessAddress}}
  </div>
</div>`,
    },
    {
      name: 'Order Shipped (Tracking)',
      type: 'ORDER_SHIPPED',
      subject: 'Your Raaghas Order #{{order.id}} has Shipped!',
      body: `<div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
  <h1 style="color: #701A31; text-align: center;">RAAGHAS</h1>
  <p>Dear {{customer.name}},</p>
  <p>Great news! Your order <strong>#{{order.id}}</strong> is on its way to you.</p>
  <div style="background: #fdfbf7; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <p style="margin:0; color: #555;"><strong>Courier:</strong> {{shipping.provider}}</p>
    <p style="margin:5px 0 0; color: #555;"><strong>Tracking Number:</strong> {{shipping.trackingNumber}}</p>
  </div>
  <p>You can track your package using the tracking link on your dashboard.</p>
  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 12px;">
    {{store.storeName}} | {{store.businessAddress}}
  </div>
</div>`,
    },
    {
      name: 'Return Approved',
      type: 'RETURN_APPROVED',
      subject: 'Update on your Return Request #{{return.id}}',
      body: `<div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
  <h1 style="color: #701A31; text-align: center;">RAAGHAS</h1>
  <p>Dear {{customer.name}},</p>
  <p>Your return request for order <strong>#{{order.id}}</strong> has been approved.</p>
  <p>Our logistics partner will contact you shortly to arrange a pickup. Please ensure the items are packed in their original condition with all tags attached.</p>
  <p>Once we receive and inspect the items, your refund will be processed to your original payment method.</p>
  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 12px;">
    {{store.storeName}} | {{store.businessAddress}}
  </div>
</div>`,
    }
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { type: t.type },
      update: {}, // Don't overwrite if it exists
      create: t,
    });
  }
  
  console.log('Templates seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
