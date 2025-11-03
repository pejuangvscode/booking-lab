const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.users.findMany({
      select: { id: true, role: true }
    });

    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Role: ${user.role}`);
    });

    if (users.length === 0) {
      console.log('No users found in database');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();