const { PrismaClient } = require('./packages/database/generated-client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres@localhost/raaghas_cert?host=/tmp"
    }
  }
});

async function check() {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'global' } });
    console.log('Settings:', JSON.stringify(settings, null, 2));
    
    // Check if WebhookEvent table exists
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
