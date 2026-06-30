import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@raaghas.in';
  const newPass = 'admin123';
  
  console.log(`🔒 Resetting password for ${email}...`);
  
  const hashedPassword = await bcrypt.hash(newPass, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Raaghas Admin'
    }
  });

  console.log(`✅ Success! Password for ${email} has been reset to: ${newPass}`);
}

main()
  .catch((e) => {
    console.error('❌ Error resetting password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
