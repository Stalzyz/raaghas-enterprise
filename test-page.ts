import { PrismaClient } from './packages/database/generated-client';
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.page.create({
    data: {
      handle: 'test-slug',
      title: 'Test Slug',
      status: 'PUBLISHED'
    }
  });
  console.log("Created", p);
  
  // Simulate PUT /api/v1/cms/pages/test-slug with new slug
  const p2 = await prisma.page.upsert({
    where: { handle: 'test-slug' },
    update: {
      handle: 'new-test-slug',
      title: 'New Test Slug'
    },
    create: {
      handle: 'test-slug',
      title: 'New Test Slug'
    }
  });
  console.log("Updated", p2);
}
main().catch(console.error).finally(() => prisma.$disconnect());
