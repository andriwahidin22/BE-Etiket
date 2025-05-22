const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Hapus relasi dulu supaya tidak error foreign key
  await prisma.review.deleteMany();           // terkait User
  await prisma.ticketInstance.deleteMany();   // terkait OrderItem
  await prisma.orderItem.deleteMany();        // terkait Order dan Ticket
  await prisma.payment.deleteMany();          // terkait Order dan User
  await prisma.order.deleteMany();            // terkait User
  await prisma.ticket.deleteMany();
  await prisma.venue.deleteMany();

  console.log("Semua tabel kecuali User telah dibersihkan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
