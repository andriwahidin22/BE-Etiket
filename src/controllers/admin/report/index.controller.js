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
          paymentStatus: PaymentStatus.PAID,
        },
        orderItems: {
          some: {
            ticket: {
              ...(category && { type: category }),
            },
          },
        },
      },
      include: {
        payment: true,
        orderItems: {
          where: {
            ...(category && {
              ticket: {
                type: category,
              },
            }),
          },
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

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        status: "empty",
        message: "Tidak ada data pembelian ditemukan untuk kategori/filter tersebut.",
        data: [],
        totalByCategory: {},
        totalAll: 0,
      });
    }

    const totalByCategory = {};
    let totalAll = 0;

    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const type = item.ticket.type;
        const totalPrice = item.totalPrice || (item.quantity * item.ticketPrice);

        if (category && type !== category) {
          // Kalau filter kategori ada, hanya hitung yang sesuai kategori
          return;
        }

        if (!totalByCategory[type]) totalByCategory[type] = 0;
        totalByCategory[type] += totalPrice;

        totalAll += totalPrice;
      });
    });

    res.status(200).json({
      status: "success",
      totalByCategory,
      totalAll,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Error generating report:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};
