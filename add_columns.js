const { PrismaClient } = require('@raaghas/database');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/raaghas"
    }
  }
});
async function run() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."StoreSettings" ADD COLUMN IF NOT EXISTS "loyaltyMinOrderValue" DECIMAL(65,30) DEFAULT 2000.00;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."StoreSettings" ADD COLUMN IF NOT EXISTS "loyaltyPointsRate" DECIMAL(65,30) DEFAULT 1.00;`);
  console.log("Success");
}
run().catch(console.error);
