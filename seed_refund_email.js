const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.emailTemplate.upsert({
    where: { type: 'REFUND_INITIATED' },
    update: {},
    create: {
      name: 'Refund Initiated',
      type: 'REFUND_INITIATED',
      subject: 'Refund Initiated for Order #{{order.id}}',
      body: `<div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
  <h1 style="color: #701A31; text-align: center;">RAAGHAS</h1>
  <p>Dear {{customer.name}},</p>
  <p>A refund has been initiated for your order <strong>#{{order.id}}</strong>.</p>
  <div style="background: #fdfbf7; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <p style="margin:0; color: #555;"><strong>Refund Amount:</strong> ₹{{refund.amount}}</p>
  </div>
  <p>Please note that it may take 5-7 business days for the funds to reflect in your original payment method depending on your bank's processing time.</p>
  <p>If you opted for Store Credit, it is instantly available in your Raaghas Wallet.</p>
  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 12px;">
    Raaghas Pvt Ltd | Salem, India
  </div>
</div>`
    }
  });
  console.log("Template created");
}
run().then(() => prisma.$disconnect());
