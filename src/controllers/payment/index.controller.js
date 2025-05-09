//file controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("../../config/midtrans");
const { v4: uuidv4 } = require("uuid");

// Initiate Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { userId, visitorName, ticketList, visitDate } = req.body;

    // Validate user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total amount
    let totalAmount = 0;
    const ticketDetails = [];
    
    for (const item of ticketList) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: item.ticketId },
        select: { id: true, code: true, type: true, price: true }
      });
      
      if (!ticket) {
        return res.status(400).json({ message: `Ticket ${item.ticketId} not found` });
      }
      
      const itemTotal = ticket.price * item.quantity;
      totalAmount += itemTotal;
      
      ticketDetails.push({
        id: ticket.id,
        name: `${ticket.type} Ticket`,
        price: ticket.price,
        quantity: item.quantity
      });
    }

    // Generate unique order ID
    const midtransOrderId = `MID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create payment record first, now including userId and visitDate
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus: "PENDING",
        midtransOrderId,
        transactionDate: new Date(),
        userId: userId,  // <-- Tambahkan userId ke payment
        visitDate: new Date(visitDate)  // <-- Tambahkan visitDate ke payment
      }
    });

    // Prepare Midtrans parameters
    const parameters = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: totalAmount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
      },
      item_details: ticketDetails.map(ticket => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity
      }))
    };

    // Create Snap transaction
    const transaction = await snap.createTransaction(parameters);
    
    // Update payment with snap token
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url
      }
    });

    res.status(201).json({
      status: "success",
      message: "Payment initiated",
      data: {
        paymentId: payment.id,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        midtransOrderId
      }
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to initiate payment",
      error: error.message
    });
  }
};

// Handle Midtrans Notification
exports.handleNotification = async (req, res) => {
  try {
    const body = req.body;
    const order_id = body?.order_id || body?.transaction_id;

    if (!order_id) return res.status(400).send('Missing order_id');

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id },
      include: {
        user: true,
        order: true
      }
    });

    if (!payment) return res.status(404).send('Payment not found');

    let statusResponse;
    try {
      statusResponse = await core.transaction.status(order_id);
    } catch (err) {
      console.warn('Gagal verifikasi ke Midtrans, pakai body:', err);
      statusResponse = body;
    }

    const {
      transaction_status,
      fraud_status,
      payment_type,
      settlement_time,
      gross_amount
    } = statusResponse;

    let paymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    if (transaction_status === 'capture') {
      paymentStatus = fraud_status === 'challenge' ? 'CHALLENGE' : 'SUCCESS';
      if (paymentStatus === 'SUCCESS') shouldCreateOrder = true;
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'SUCCESS';
      shouldCreateOrder = true;
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      paymentStatus = 'FAILED';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus,
        paymentMethod: payment_type,
        settlementTime: settlement_time ? new Date(settlement_time) : null,
        updatedAt: new Date()
      }
    });

    if (shouldCreateOrder && !payment.order) {
      await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderCode: `ORD-${Date.now()}`,
            visitorName: payment.user?.fullName || 'Customer',
            visitDate: payment.visitDate || new Date(),
            userId: payment.userId,
            payment: { connect: { id: payment.id } }
          }
        });

        // Buat order item dari data tiket (contoh hardcoded satu jenis tiket)
        // Idealnya, tiket disimpan saat pembuatan payment (di table lain atau serialized JSON)
        const exampleTicket = await tx.ticket.findFirst(); // Ambil default ticket

        if (exampleTicket) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ticketId: exampleTicket.id,
              quantity: 1,
              ticketPrice: exampleTicket.price
            }
          });
        }

        console.log(`Order ${newOrder.id} created for payment ${payment.id}`);
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).send('Internal Server Error');
  }
};



// Check Payment Status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check in database first
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: orderId },
      include: { order: true }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Optional: Verify with Midtrans
    let midtransStatus = null;
    try {
      const status = await core.transaction.status(orderId);
      midtransStatus = status.transaction_status;
    } catch (error) {
      console.warn("Failed to check Midtrans status:", error.message);
    }

    res.status(200).json({
      status: "success",
      data: {
        paymentStatus: payment.paymentStatus,
        midtransStatus,
        orderCreated: !!payment.orderId,
        order: payment.order
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error",
      message: "Failed to check payment status",
      error: error.message
    });
  }
};