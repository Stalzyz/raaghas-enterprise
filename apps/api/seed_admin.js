const { PrismaClient } = require('@raaghas/database');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@raaghas.in';
  const newPass = 'admin123';
  const hashedPassword = await bcrypt.hash(newPass, 10);
  
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    },
    create: {
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      name: 'Raaghas Admin'
    }
  });
  console.log('Done seeding SUPER_ADMIN');
}
main().catch(console.error).finally(() => prisma.$disconnect());
