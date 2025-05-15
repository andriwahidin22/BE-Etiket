const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboard = async (req, res) => {
  try {
    // Get counts for dashboard
    const usersCount = await prisma.user.count();
    const ordersCount = await prisma.order.count();
    const paymentsCount = await prisma.payment.count();
    
    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });

    res.status(200).json({
      status: "success",
      data: {
        counts: {
          users: usersCount,
          orders: ordersCount,
          payments: paymentsCount
        },
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error",
      message: "Failed to get dashboard data",
      error: error.message 
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: {
          include: { ticket: true }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: "success",
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get order details",
      error: error.message
    });
  }
};

module.exports = { 
  getDashboard,
  getOrderDetails
};