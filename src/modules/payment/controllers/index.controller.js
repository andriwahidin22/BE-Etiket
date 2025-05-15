// controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("@/config/midtrans");
const { v4: uuidv4 } = require("uuid");

exports.createPayment = async (req, res) => {
  try {
    const {
      userId,
      visitorName,
      ticketList,
      paymentStatus,
      transactionDate,
      visitDate,
    } = req.body;

    // Validate user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total payment
    const totalAmount = await ticketList.reduce(async (acc, ticketData) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketData.ticketId },
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
      },
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
          connect: { id: payment.id },
        },
      },
    });

    // Save order items for each ticket
    for (let ticketData of ticketList) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketData.ticketId },
      });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ticketId: ticket.id,
          quantity: ticketData.quantity,
          ticketPrice: ticket.price,
        },
      });
    }

    // Update payment with order relation
    await prisma.payment.update({
      where: { id: payment.id },
      data: { orderId: order.id },
    });

    res.status(201).json({
      status: "success",
      message: "Payment initiated",
      data: {
        payment,
        order,
      },
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

// Handle Midtrans Notification (dengan generate PDF dan kirim email)
exports.handleNotification = async (req, res) => {
  try {
    const body = req.body;
    const order_id = body?.order_id || body?.transaction_id;

    if (!order_id) return res.status(400).send('Missing order_id');

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id },
      include: {
        user: true,
        order: {
          include: {
            orderItems: {
              include: { ticket: true }
            }
          }
        }
      }
    });

    if (!payment) return res.status(404).send('Payment not found');

    let statusResponse;
    try {
      statusResponse = await core.transaction.status(order_id);
    } catch (err) {
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

        // Contoh: buat order item dari tiket yang ada di payment (Anda bisa sesuaikan sesuai data tiket sebenarnya)
        // Jika Anda menyimpan tiket di payment, gunakan data tersebut. Jika tidak, ambil default ticket.
        const exampleTicket = await tx.ticket.findFirst();

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

        // Setelah order dan order item dibuat, generate PDF tiket
        const orderWithItems = await tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            orderItems: { include: { ticket: true } }
          }
        });

        // Pastikan folder tickets ada
        const ticketsDir = path.join(__dirname, "../../../tickets");
        if (!fs.existsSync(ticketsDir)) {
          fs.mkdirSync(ticketsDir, { recursive: true });
        }
        const pdfPath = path.join(ticketsDir, `${newOrder.orderCode}.pdf`);

        await generatePDF(orderWithItems, orderWithItems.orderItems, payment.user, pdfPath);

        // Kirim email dengan lampiran tiket
        await sendEmail(
          payment.user.email,
          "E-Tiket Museum Lampung",
          `Halo ${payment.user.fullName},\n\nPembayaran Anda telah berhasil. Berikut adalah e-tiket Anda untuk kunjungan pada ${new Date(orderWithItems.visitDate).toLocaleDateString("id-ID")}.`,
          pdfPath
        );
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
      where: { id: parseInt(req.params.id) },
      include: {
        order: { include: { orderItems: { include: { ticket: true } } } },
      },
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
      // ignore error
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

