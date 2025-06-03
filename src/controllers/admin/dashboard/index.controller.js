// src/controllers/dashboard/index.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { formatIndonesianDate } = require("../../../utils/dateFormatter");

// Cache for storing monthly sales data to reduce database queries
const salesCache = {
  data: null,
  lastUpdated: null,
  ttl: 1000 * 60 * 5,
};

exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date in Indonesian format
    const now = new Date();
    const formattedDate = formatIndonesianDate(now);

    // Use Promise.all for parallel execution of independent queries
    const [totalCollections, totalVisitors] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticketInstance.count({
        where: { attendanceStatus: "ARRIVED" },
      }),
    ]);

    // Check if we have fresh cached data
    const currentYear = now.getFullYear();
    let monthlySales;

    if (
      salesCache.data &&
      salesCache.lastUpdated &&
      now - salesCache.lastUpdated < salesCache.ttl
    ) {
      monthlySales = salesCache.data;
    } else {
      monthlySales = await getMonthlyTicketSales(currentYear);
      salesCache.data = monthlySales;
      salesCache.lastUpdated = now;
    }

    res.status(200).json({
      status: "success",
      data: {
        totalCollections,
        totalVisitors,
        currentDate: formattedDate,
        monthlySales,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dashboard statistics",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

async function getMonthlyTicketSales(year) {
  try {
    // Get all orders with items for the given year
    const orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
        payment: {
          paymentStatus: "SUCCESS",
        },
      },
      select: {
        visitDate: true,
        orderItems: {
          select: {
            quantity: true,
            ticket: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    // Initialize monthly data structure
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const monthlyData = months.map((month) => ({
      month,
      dewasa: 0,
      anak: 0,
      mahasiswa: 0,
      total: 0,
    }));

    // Process each order to aggregate data
    orders.forEach((order) => {
      const monthIndex = new Date(order.visitDate).getMonth();

      order.orderItems.forEach((item) => {
        const ticketType = item.ticket.type.toLowerCase();
        const count = item.quantity;

        // Update totals
        monthlyData[monthIndex].total += count;

        // Categorize ticket types
        if (ticketType.includes("dewasa")) {
          monthlyData[monthIndex].dewasa += count;
        } else if (ticketType.includes("anak")) {
          monthlyData[monthIndex].anak += count;
        } else if (ticketType.includes("mahasiswa")) {
          monthlyData[monthIndex].mahasiswa += count;
        }
      });
    });

    return monthlyData;
  } catch (error) {
    console.error("Error in getMonthlyTicketSales:", error);
    throw error;
  }
}

exports.getRecentOrders = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20); // Max 20 orders

    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderCode: true,
        visitDate: true,
        createdAt: true,
        attendanceStatus: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        payment: {
          select: {
            totalAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    // Format dates for better readability
    const formattedOrders = orders.map((order) => ({
      ...order,
      visitDate: order.visitDate.toISOString().split("T")[0],
      createdAt: order.createdAt.toISOString().replace("T", " ").split(".")[0],
    }));

    res.status(200).json({
      status: "success",
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Get recent orders failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch recent orders",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

exports.getVisitorStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date inputs
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid start date format",
      });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid end date format",
      });
    }

    const whereClause = {
      attendanceStatus: "ARRIVED",
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.createdAt = {
        lte: new Date(endDate),
      };
    }

    const visitors = await prisma.ticketInstance.count({
      where: whereClause,
    });

    // Get additional stats if date range is provided
    let dailyStats = [];
    if (startDate && endDate) {
      dailyStats = await getDailyVisitorStats(
        new Date(startDate),
        new Date(endDate)
      );
    }

    res.status(200).json({
      status: "success",
      data: {
        totalVisitors: visitors,
        dailyStats,
      },
    });
  } catch (error) {
    console.error("Get visitor stats failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch visitor statistics",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

async function getDailyVisitorStats(startDate, endDate) {
  try {
    const result = await prisma.ticketInstance.groupBy({
      by: ["createdAt"],
      where: {
        attendanceStatus: "ARRIVED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Format the results
    return result.map((item) => ({
      date: item.createdAt.toISOString().split("T")[0],
      count: item._count.id,
    }));
  } catch (error) {
    console.error("Error in getDailyVisitorStats:", error);
    return [];
  }
}

// Additional endpoint for revenue statistics
exports.getRevenueStats = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const payments = await prisma.payment.findMany({
      where: {
        paymentStatus: "SUCCESS",
        transactionDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      select: {
        transactionDate: true,
        totalAmount: true,
      },
    });

    // Initialize monthly revenue
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const monthlyRevenue = months.map((month) => ({
      month,
      revenue: 0,
    }));

    // Calculate monthly revenue
    payments.forEach((payment) => {
      const monthIndex = new Date(payment.transactionDate).getMonth();
      monthlyRevenue[monthIndex].revenue += payment.totalAmount;
    });

    // Calculate total revenue
    const totalRevenue = monthlyRevenue.reduce(
      (sum, month) => sum + month.revenue,
      0
    );

    res.status(200).json({
      status: "success",
      data: {
        totalRevenue,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error("Get revenue stats failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch revenue statistics",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};
