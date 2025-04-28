//file controllers/orderController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { userId, visitorName, ticketList, visitDate } = req.body;

    // Check user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate order code
    const orderCode = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;

    // Save order
    const order = await prisma.order.create({
      data: {
        orderCode,
        visitorName,
        visitDate: new Date(visitDate),
        userId
      }
    });

    // Save order items for each ticket
    for (let ticketData of ticketList) {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketData.ticketId } });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ticketId: ticket.id,
          quantity: ticketData.quantity,
          ticketPrice: ticket.price
        }
      });
    }

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create order",
      error: error.message
    });
  }
};

// GET ALL ORDERS
exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { orderItems: { include: { ticket: true } }, user: true }
    });
    res.status(200).json({
      status: "success",
      data: orders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { orderItems: { include: { ticket: true } } }
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};