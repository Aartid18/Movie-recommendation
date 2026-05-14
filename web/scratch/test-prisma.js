const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (error) {
    console.error('Prisma error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
