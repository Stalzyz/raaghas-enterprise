import { PrismaClient } from './packages/database/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.emailTemplate.upsert({
    where: { type: 'CART_ABANDONED_REMINDER' },
    update: {
      name: "Abandoned Cart Reminder",
      subject: "You left something behind in your atelier... | Raaghas",
      body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Pending Curation</p><h1 style="font-size: 32px; margin: 0 0 40px 0;">Complete Your Acquisition</h1><p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear {{customerName}},<br/><br/>We noticed you left some exquisite pieces behind in your cart. Your selections have been reserved, but demand is high.</p><a href="https://raaghas.in/cart" class="button-premium">Return to Checkout</a></div>`
    },
    create: {
      name: "Abandoned Cart Reminder",
      type: "CART_ABANDONED_REMINDER",
      subject: "You left something behind in your atelier... | Raaghas",
      body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Pending Curation</p><h1 style="font-size: 32px; margin: 0 0 40px 0;">Complete Your Acquisition</h1><p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear {{customerName}},<br/><br/>We noticed you left some exquisite pieces behind in your cart. Your selections have been reserved, but demand is high.</p><a href="https://raaghas.in/cart" class="button-premium">Return to Checkout</a></div>`
    }
  });
  console.log("Seeded CART_ABANDONED_REMINDER");
}

main().catch(console.error).finally(() => prisma.$disconnect());
