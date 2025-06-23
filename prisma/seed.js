#!/usr/bin/env node
const seedAdmin = require('./seeders/admin.seed');

async function main() {
  console.log('🚀 Starting database seeding...');
  
  try {
    // Jalankan seeders secara berurutan
    await seedAdmin();
    
    console.log('\n🎉 All seeders completed successfully!');
  } catch (error) {
    console.error('\n🔥 Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit();
  }
}

main();