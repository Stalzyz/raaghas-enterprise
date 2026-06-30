const { PrismaClient } = require('@raaghas/database');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
async function run() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, permissions: [] },
    '87AkYYOOGO2mM8gzBOGVRGjK0Io+0MidlPPZNgdwetU88pzxNwkbQvlemYHcjSb0'
  );
  console.log(token);
}
run();
