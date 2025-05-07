const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async () => {
  console.log('\n💰 Seeding payment data...');

  try {
    // Contoh data payment dummy
    const paymentMethods = [
      { name: 'Bank Transfer', isActive: true },
      { name: 'Credit Card', isActive: true },
      { name: 'E-Wallet', isActive: false }
    ];

    const results = [];
    
    for (const method of paymentMethods) {
      const existing = await prisma.paymentMethod.findFirst({
        where: { name: method.name }
      });

      if (existing) {
        console.log(`⏩ Payment method "${method.name}" already exists`);
        results.push(existing);
        continue;
      }

      const created = await prisma.paymentMethod.create({
        data: method
      });
      
      console.log(`✅ Created payment method: ${created.name}`);
      results.push(created);
    }

    return results;
  } catch (error) {
    console.error('❌ Failed to seed payment methods:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};