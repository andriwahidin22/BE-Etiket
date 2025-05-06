//file controllers/paymentController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

exports.createPayment = async (req, res) => {
  try {
    const {
      userId,
      visitorName,
      ticketList,
      paymentStatus,
      transactionDate,
      visitDate
    } = req.body;

    // Check user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total payment
    const totalAmount = await ticketList.reduce(async (acc, ticketData) => {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketData.ticketId } });
      if (!ticket) {
        throw new Error(`Ticket ID ${ticketData.ticketId} not found`);
      }
      const ticketTotal = ticket.price * ticketData.quantity;
      return acc + ticketTotal;
    }, 0);

    // Generate Order ID for Midtrans
    const midtransOrderId = `MID-${uuidv4().split("-")[0].toUpperCase()}`;

    // Save payment first
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus,
        transactionDate: new Date(transactionDate),
        midtransOrderId,
      }
    });

    // Generate order code and save order
    const orderCode = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderCode,
        visitorName,
        visitDate: new Date(visitDate),
        userId,
        payments: {
          connect: { id: payment.id }
        }
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

    // Update payment with order relation
    await prisma.payment.update({
      where: { id: payment.id },
      data: { orderId: order.id }
    });

    res.status(201).json({
      status: "success",
      message: "Payment processed successfully",
      data: {
        payment,
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Payment processing failed",
      error: error.message,
    });
  }
};

// GET ALL PAYMENTS
exports.getPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: { orderItems: { include: { ticket: true } } },
        },
      },
    });
    res.status(200).json({
      status: "success",
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PAYMENT BY ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { order: { include: { orderItems: { include: { ticket: true } } } } },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ status: "success", data: payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};