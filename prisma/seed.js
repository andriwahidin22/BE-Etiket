const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bulindev.test';
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: 'Admin Bulindev',
        phoneNumber: '081234567890',
        role: 'ADMIN',
      },
    });

    console.log('✅ User created:', user);
  } else {
    console.log('⚠️ User already exists:', existing.email);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
