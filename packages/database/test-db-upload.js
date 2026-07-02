const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const Papa = require('papaparse');
const prisma = new PrismaClient();

async function run() {
  const csvString = fs.readFileSync('/Users/stalinkumar/Downloads/raw silk 27.csv', 'utf-8');
  const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true, dynamicTyping: true });
  
  // Just use the logic from the service to see if any errors happen
  // I will mock the tx
  // Actually, let's just see if we can find the product in DB to see its variants
  const handle = "premium-wear27061";
  const product = await prisma.product.findUnique({ where: { handle }, include: { variants: true } });
  console.log(JSON.stringify(product, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
