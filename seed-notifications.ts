import { PrismaClient } from '@raaghas/database';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
  {
    name: 'Order Confirmation',
    type: 'ORDER_PLACED',
    subject: 'Thank you for your order #{{order.id}}',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #4A0E0E; text-align: center;">Thank you for your purchase!</h1>
        <p>Hi {{customerName}},</p>
        <p>We've received your order <strong>#{{order.id}}</strong> and we're getting it ready for shipment.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Summary</h3>
          <p>Total: ₹{{order.totalAmount}}</p>
        </div>
        <p>You'll receive another email once your order has shipped.</p>
        <p>Best regards,<br/>The Raaghas Team</p>
      </div>
    `,
    isActive: true
  },
  {
    name: 'Order Shipped',
    type: 'ORDER_SHIPPED',
    subject: 'Your order #{{order.id}} is on its way!',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #4A0E0E; text-align: center;">Your order has shipped!</h1>
        <p>Hi {{customerName}},</p>
        <p>Great news! Your order <strong>#{{order.id}}</strong> has been shipped and is on its way to you.</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Tracking Number:</strong> {{order.trackingId}}</p>
          <p><strong>Carrier:</strong> {{order.carrierName}}</p>
          <a href="{{order.trackingUrl}}" style="display: inline-block; background: #4A0E0E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Track My Order</a>
        </div>
        <p>Best regards,<br/>The Raaghas Team</p>
      </div>
    `,
    isActive: true
  }
,
  {
    name: 'Return Approved',
    type: 'RETURN_APPROVED',
    subject: 'Your return request for Order #{{order.id}} has been approved',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h1 style="color: #4A0E0E;">Return Request Approved</h1>
        <p>Hi {{customerName}},</p>
        <p>Your return request for items in order <strong>#{{order.id}}</strong> has been approved.</p>
        <p>Please follow the instructions below to complete your return:</p>
        <ol>
          <li>Pack the items securely in their original packaging.</li>
          <li>Include the original invoice.</li>
          <li>Our courier partner will pick up the package within 2-3 business days.</li>
        </ol>
        <p>Once we receive and inspect the items, we will process your refund.</p>
        <p>Best regards,<br/>The Raaghas Team</p>
      </div>
    `,
    isActive: true
  },
  {
    name: 'Return Approved',
    type: 'RETURN_APPROVED',
    subject: 'Your return request for Order #{{order.id}} has been approved',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #4A0E0E; text-align: center;">Return Request Approved</h1>
        <p>Hi {{customerName}},</p>
        <p>Your return request for items in order <strong>#{{order.id}}</strong> has been approved.</p>
        <p>Please follow the instructions below to complete your return:</p>
        <ol>
          <li>Pack the items securely in their original packaging.</li>
          <li>Include the original invoice.</li>
          <li>Our courier partner will pick up the package within 2-3 business days.</li>
        </ol>
        <p>Once we receive and inspect the items, we will process your refund.</p>
        <p>Best regards,<br/>The Raaghas Team</p>
      </div>
    `,
    isActive: true
  }
];

async function main() {
  console.log('Seeding notification templates...');
  
  for (const template of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { type: template.type },
      update: {
        name: template.name,
        subject: template.subject,
        body: template.body,
        isActive: template.isActive
      },
      create: template
    });
  }

  console.log('Notification templates seeded successfully! 📧');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
