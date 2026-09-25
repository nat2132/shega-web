const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, is_admin: true, is_superuser: true }
  });
  console.log('Users in DB:', users);
  const payments = await prisma.payment.findMany({
    select: { id: true, amount: true, status: true, transaction_id: true, customer_id: true }
  });
  console.log('Payments in DB:', payments);
}

main().then(() => prisma.$disconnect()).catch(console.error);
