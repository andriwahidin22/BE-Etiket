//src/controllers/admin/report/index.controller.js

const { PrismaClient, PaymentStatus } = require("@prisma/client");
const generateReportPDF = require("../../../utils/generateReportPDF");
const prisma = new PrismaClient();

function groupOrdersByDate(orders) {
  const summary = {};
  orders.forEach(order => {
    const dateKey = new Date(order.visitDate).toLocaleDateString("id-ID");

    if (!summary[dateKey]) {
      summary[dateKey] = {
        byCategory: {},
        total: 0,
      };
    }

    order.orderItems.forEach(item => {
      const type = item.ticket.type;
      const total = item.totalPrice || item.ticketPrice * item.quantity;

      if (!summary[dateKey].byCategory[type]) {
        summary[dateKey].byCategory[type] = 0;
      }

      summary[dateKey].byCategory[type] += total;
      summary[dateKey].total += total;
    });
  });
  return summary;
}

exports.getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, category, generatePdf } = req.body;
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
        message: "Tidak ada data pembelian ditemukan.",
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
        const total = item.totalPrice || item.ticketPrice * item.quantity;

        if (category && type !== category) return;

        if (!totalByCategory[type]) totalByCategory[type] = 0;
        totalByCategory[type] += total;

        totalAll += total;
      });
    });

    if (generatePdf) {
      const summary = groupOrdersByDate(orders);
      const periodLabel = `${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")}`;
      const fileName = await generateReportPDF({ summary, totalAll, periodLabel, orders });

      return res.status(200).json({
        status: "success",
        message: "Laporan PDF berhasil dibuat",
        fileUrl: `/reports/${fileName}`,
      });
    }

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

