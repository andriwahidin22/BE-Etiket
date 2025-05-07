//file controllers/indexController.js

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
    
    // Create payment record first
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus: "PENDING",
        midtransOrderId,
        transactionDate: new Date()
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
    const notification = req.body;
    
    // Verify notification
    const statusResponse = await core.transaction.notification(notification);
    const { order_id, transaction_status, fraud_status, payment_type, settlement_time } = statusResponse;
    
    console.log(`Processing notification for order: ${order_id}`);
    console.log(`Status: ${transaction_status}, Fraud: ${fraud_status}`);

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Determine payment status
    let paymentStatus = payment.paymentStatus;
    
    if (transaction_status === 'capture') {
      paymentStatus = fraud_status === 'challenge' ? 'CHALLENGE' : 'SUCCESS';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'SUCCESS';
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      paymentStatus = 'FAILED';
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus,
        paymentMethod: payment_type,
        settlementTime: settlement_time ? new Date(settlement_time) : null
      }
    });

    // Only create order if payment is successful
    if (paymentStatus === 'SUCCESS' && !payment.orderId) {
      const orderData = await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            orderCode: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            visitorName: "Will be updated", // You might want to store this elsewhere
            visitDate: new Date(),
            userId: payment.userId || null,
            attendanceStatus: "NOT_ARRIVED"
          }
        });

        // Link payment to order
        await tx.payment.update({
          where: { id: payment.id },
          data: { orderId: order.id }
        });

        return order;
      });

      console.log(`Order created: ${orderData.id}`);
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Notification processing error:", error);
    res.status(500).json({ 
      status: "error",
      message: "Failed to process notification",
      error: error.message
    });
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