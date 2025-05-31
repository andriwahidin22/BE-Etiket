const { PrismaClient, PaymentStatus } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: start,
          lte: end,
        },
        payment: {
          paymentStatus: PaymentStatus.PAID, // ✅ enum, bukan string
        },
      },
      include: {
        payment: true,
        orderItems: {
          include: {
            ticket: true,
            ticketInstances: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        visitDate: "asc",
      },
    });

    res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    console.error("❌ Error generating report:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

