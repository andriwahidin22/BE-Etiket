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

function calculateTotals(orders, category) {
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

  return { totalByCategory, totalAll };
}

exports.getPurchaseReportView = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ status: "error", message: "Parameter startDate dan endDate wajib diisi." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: start,
          lte: end,
        },
        payment: {
          paymentStatus: PaymentStatus.PAID,
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

    if (category) {
      orders.forEach(order => {
        order.orderItems = order.orderItems.filter(item => item.ticket.type === category);
      });

      orders = orders.filter(order => order.orderItems.length > 0);
    }

    if (!orders.length) {
      return res.status(200).json({
        status: "empty",
        message: "Tidak ada data pembelian ditemukan.",
        data: [],
        totalByCategory: {},
        totalAll: 0,
      });
    }

    const { totalByCategory, totalAll } = calculateTotals(orders, category);

    return res.status(200).json({
      status: "success",
      data: orders,
      totalByCategory,
      totalAll,
    });

  } catch (error) {
    console.error("❌ Error fetching report view:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, category, generatePdf } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    let orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: start,
          lte: end,
        },
        payment: {
          paymentStatus: PaymentStatus.PAID,
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

    if (category) {
      orders.forEach(order => {
        order.orderItems = order.orderItems.filter(item => item.ticket.type === category);
      });

      orders = orders.filter(order => order.orderItems.length > 0);
    }

    if (!orders.length) {
      return res.status(200).json({
        status: "empty",
        message: "Tidak ada data pembelian ditemukan.",
        data: [],
        totalByCategory: {},
        totalAll: 0,
      });
    }

    const { totalByCategory, totalAll } = calculateTotals(orders, category);

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

    return res.status(200).json({
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

exports.getPurchaseReportDownload = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let orders = await prisma.order.findMany({
      where: {
        visitDate: { gte: start, lte: end },
        payment: { paymentStatus: PaymentStatus.PAID },
      },
      include: {
        payment: true,
        orderItems: {
          include: { ticket: true, ticketInstances: true },
        },
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { visitDate: "asc" },
    });

    if (category) {
      orders = orders
        .map(order => ({
          ...order,
          orderItems: order.orderItems.filter(item => item.ticket.type === category),
        }))
        .filter(order => order.orderItems.length > 0);
    }

    if (!orders.length) {
      return res.status(404).json({
        status: "empty",
        message: "Tidak ada data pembelian ditemukan.",
      });
    }

    const summary = groupOrdersByDate(orders);
    const periodLabel = `${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")}`;
    const { totalAll } = calculateTotals(orders, category);

    const fileName = await generateReportPDF({ summary, totalAll, periodLabel, orders });

    return res.download(`reports/${fileName}`);
  } catch (err) {
    console.error("❌ Error downloading PDF:", err);
    return res.status(500).json({ status: "error", message: "Gagal menghasilkan laporan PDF", error: err.message });
  }
};