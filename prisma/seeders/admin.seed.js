const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

module.exports = async () => {
  console.log('\n🌱 Seeding admin user...');
  
  const adminData = {
    email: 'admin@example.com',
    plainPassword: 'admin123',
    fullName: 'Admin Utama',
    phoneNumber: '08123456789',
    role: 'ADMIN'
  };

  try {
    const hashedPassword = await bcrypt.hash(adminData.plainPassword, 10);
    const existingAdmin = await prisma.user.findUnique({ 
      where: { email: adminData.email } 
    });

    if (existingAdmin) {
      console.log('⏩ Admin already exists:', existingAdmin.email);
      return existingAdmin;
    }

    const newAdmin = await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        fullName: adminData.fullName,
        phoneNumber: adminData.phoneNumber,
        role: adminData.role
      }
    });

    console.log('✅ Admin created successfully:', newAdmin);
    return newAdmin;
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};