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
    console.log('Raw notification body:', req.body);

    // Pastikan body tidak kosong
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Empty notification body');
      return res.status(400).send('Bad Request');
    }

    // 1. Cari payment record terlebih dahulu
    const order_id = req.body.order_id || req.body.transaction_id;
    if (!order_id) {
      return res.status(400).send('Missing order_id');
    }

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id }
    });

    if (!payment) {
      console.error(`Payment not found: ${order_id}`);
      return res.status(404).send('Payment not found');
    }

    // 2. Verifikasi notifikasi (dengan error handling)
    let statusResponse;
    try {
      // Gunakan parameter yang lebih spesifik
      statusResponse = await core.transaction.status(order_id);
      console.log('Transaction status:', statusResponse);
    } catch (verifyError) {
      console.error('Verification failed, using raw notification:', verifyError);
      // Fallback ke data notifikasi langsung jika verifikasi gagal
      statusResponse = req.body;
    }

    const { 
      transaction_status, 
      fraud_status,
      payment_type,
      settlement_time,
      gross_amount
    } = statusResponse;

    // 3. Update status pembayaran
    let paymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    if (transaction_status === 'capture') {
      paymentStatus = fraud_status === 'challenge' ? 'CHALLENGE' : 'SUCCESS';
      if (paymentStatus === 'SUCCESS') shouldCreateOrder = true;
    } 
    else if (transaction_status === 'settlement') {
      paymentStatus = 'SUCCESS';
      shouldCreateOrder = true;
    }
    else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      paymentStatus = 'FAILED';
    }

    // 4. Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus,
        paymentMethod: payment_type,
        settlementTime: settlement_time ? new Date(settlement_time) : null,
        updatedAt: new Date()
      }
    });

    // 5. Buat order jika sukses
    if (shouldCreateOrder && !payment.orderId) {
      try {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              orderCode: `ORD-${Date.now()}`,
              visitorName: payment.visitorName || 'Customer',
              visitDate: payment.visitDate || new Date(),
              userId: payment.userId,
              payment: { connect: { id: payment.id } }
            }
          });

          await tx.ticket.create({
            data: {
              code: `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
              type: 'REGULAR',
              price: parseInt(gross_amount) || payment.totalAmount,
              orderId: order.id
            }
          });

          console.log(`Created order ${order.id} with ticket`);
        });
      } catch (orderError) {
        console.error('Order creation failed:', orderError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Notification processing error:', error);
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