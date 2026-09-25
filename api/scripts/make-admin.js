const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.update({
    where: { username: 'qa_tester_e2e' },
    data: { is_admin: true, is_superuser: true, is_staff: true }
  });
  console.log('Successfully made admin:', u.username);
}

main().then(() => prisma.$disconnect()).catch(console.error);
