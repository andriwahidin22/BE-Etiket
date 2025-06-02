// controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("../../config/midtrans");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generateTicketPDF = require("../../utils/generateTicketPDF");
const generateInvoicePDF = require("../../utils/generateInvoicePDF");

// Endpoint untuk memulai pembayaran
exports.initiatePayment = async (req, res) => {
  try {
    const { userId, ticketList, visitDate } = req.body;

    // Validasi user berdasarkan userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hitung total harga dan siapkan detail tiket untuk Midtrans
    let totalAmount = 0;
    const ticketDetails = [];

    for (const item of ticketList) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: item.ticketId },
        select: { id: true, code: true, type: true, price: true },
      });

      if (!ticket) {
        return res
          .status(400)
          .json({ message: `Ticket ${item.ticketId} not found` });
      }

      const itemTotal = ticket.price * item.quantity;
      totalAmount += itemTotal;

      ticketDetails.push({
        id: ticket.id.toString(),
        name: `${ticket.type} Ticket`,
        price: ticket.price,
        quantity: item.quantity,
      });
    }

    // Generate order ID unik untuk Midtrans
    const midtransOrderId = `MID-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Simpan record payment dengan status PENDING
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus: "PENDING",
        midtransOrderId,
        transactionDate: new Date(),
        userId: userId,
        visitDate: new Date(visitDate),
        ticketDetails: ticketList, // Simpan snapshot tiket
      },
    });

    // Siapkan parameter transaksi untuk Midtrans Snap
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
      item_details: ticketDetails,
    };

    // Buat transaksi Snap di Midtrans
    const transaction = await snap.createTransaction(parameters);

    // Update payment dengan snap token dan redirect URL
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });

    // Kirim response sukses dengan data token dan URL
    res.status(201).json({
      status: "success",
      message: "Payment initiated",
      data: {
        paymentId: payment.id,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        midtransOrderId,
      },
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
};

// Endpoint untuk menerima notifikasi pembayaran dari Midtrans
exports.handleNotification = async (req, res) => {
  try {
    const body = req.body;
    const order_id = body?.order_id || body?.transaction_id;

    if (!order_id) return res.status(400).send("Missing order_id");

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: order_id },
      include: {
        user: true,
        order: {
          include: {
            orderItems: {
              include: { ticket: true, ticketInstances: true },
            },
          },
        },
      },
    });

    if (!payment) return res.status(404).send("Payment not found");

    // Ambil status transaksi dari Midtrans jika bisa
    let statusResponse;
    try {
      statusResponse = await core.transaction.status(order_id);
    } catch (err) {
      statusResponse = body; // fallback dari webhook payload
    }

    const { transaction_status, fraud_status, payment_type, settlement_time } =
      statusResponse;

    let paymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    if (transaction_status === "capture") {
      paymentStatus = fraud_status === "challenge" ? "CHALLENGE" : "SUCCESS";
      if (paymentStatus === "SUCCESS") shouldCreateOrder = true;
    } else if (transaction_status === "settlement") {
      paymentStatus = "SUCCESS";
      shouldCreateOrder = true;
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      paymentStatus = "FAILED";
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus,
        paymentMethod: payment_type,
        settlementTime: settlement_time ? new Date(settlement_time) : null,
        updatedAt: new Date(),
      },
    });

    let newOrderId = null;

    // Cek order sudah ada atau belum
    const hasOrder =
      payment.order &&
      (!Array.isArray(payment.order) || payment.order.length > 0);

    if (shouldCreateOrder && !hasOrder) {
      await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderCode: `ORD-${Date.now()}`,
            visitorName: payment.user?.fullName || "Customer",
            visitDate: payment.visitDate || new Date(),
            userId: payment.userId,
            payment: { connect: { id: payment.id } },
          },
        });

        newOrderId = newOrder.id;

        const purchasedTickets = payment.ticketDetails;
        if (
          !purchasedTickets ||
          !Array.isArray(purchasedTickets) ||
          purchasedTickets.length === 0
        ) {
          throw new Error("No valid ticketDetails found in payment.");
        }

        for (const item of purchasedTickets) {
          const ticket = await tx.ticket.findUnique({
            where: { id: item.ticketId },
          });
          if (!ticket) continue;

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ticketId: ticket.id,
              quantity: item.quantity,
              ticketPrice: ticket.price,
              totalPrice: ticket.price * item.quantity,
            },
          });

          // Generate ticketInstances sesuai quantity
          for (let i = 0; i < item.quantity; i++) {
            const qrCode = `TICKET-${
              orderItem.id
            }-${i}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await tx.ticketInstance.create({
              data: {
                orderItemId: orderItem.id,
                qrCode,
                attendanceStatus: "NOT_ARRIVED",
              },
            });
          }
        }
      });

      // Ambil kembali order dengan semua relasi untuk generate PDF dan kirim email
      const orderWithItems = await prisma.order.findUnique({
        where: { id: newOrderId },
        include: {
          orderItems: {
            include: {
              ticket: true,
              ticketInstances: true,
            },
          },
        },
      });

      // Gabungkan semua ticketInstances dari semua orderItems
      const allTicketInstances = orderWithItems.orderItems.flatMap(
        (item) => item.ticketInstances
      );

      // Pastikan direktori ada
      const invoicesDir = path.join(__dirname, "../../../invoices");
      const ticketsDir = path.join(__dirname, "../../../tickets");
      if (!fs.existsSync(invoicesDir))
        fs.mkdirSync(invoicesDir, { recursive: true });
      if (!fs.existsSync(ticketsDir))
        fs.mkdirSync(ticketsDir, { recursive: true });

      const invoicePath = path.join(
        invoicesDir,
        `${orderWithItems.orderCode}_invoice.pdf`
      );
      const ticketPath = path.join(
        ticketsDir,
        `${orderWithItems.orderCode}_tickets.pdf`
      );

      // Generate PDF tiket & invoice
      await generateTicketPDF({
        order: orderWithItems,
        orderItems: orderWithItems.orderItems,
        ticketInstances: allTicketInstances,
        user: payment.user,
        outputPath: ticketPath,
      });

      const invoiceBuffer = await generateInvoicePDF(
        orderWithItems,
        payment.user
      );
      fs.writeFileSync(invoicePath, invoiceBuffer);

      // Validasi environment variables email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("EMAIL_USER or EMAIL_PASS env variable not set!");
        throw new Error("Email configuration missing");
      }

      // Kirim email dengan invoice dan tiket
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: payment.user.email,
          subject: "Invoice dan E-Tiket Museum Lampung",
          text: `Halo ${
            payment.user.fullName
          },\n\nPembayaran Anda telah berhasil. Berikut adalah invoice dan e-tiket Anda untuk kunjungan pada ${new Date(
            orderWithItems.visitDate
          ).toLocaleDateString("id-ID")}.`,
          attachments: [
            { filename: path.basename(invoicePath), path: invoicePath },
            { filename: path.basename(ticketPath), path: ticketPath },
          ],
        });
        console.log(`📧 Email sent to ${payment.user.email}`);
      } catch (emailErr) {
        console.error("❌ Failed to send email:", emailErr);
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Notification error:", err);
    res.status(500).send("Internal Server Error");
  }
};

// Endpoint untuk cek status pembayaran berdasarkan midtransOrderId
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Cari payment di database
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: orderId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Optional: cek status di Midtrans
    let midtransStatus = null;
    try {
      const status = await core.transaction.status(orderId);
      midtransStatus = status.transaction_status;
    } catch (error) {
      // Abaikan error jika gagal cek Midtrans
    }

    res.status(200).json({
      status: "success",
      data: {
        paymentStatus: payment.paymentStatus,
        midtransStatus,
        orderCreated: !!payment.orderId,
        order: payment.order,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to check payment status",
      error: error.message,
    });
  }
};

// Get all payments with user info
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { transactionDate: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        order: {
          select: {
            orderCode: true,
            visitDate: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve payments",
      error: error.message,
    });
  }
};

// Ambil semua payment milik user yang sedang login
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id; // diasumsikan middleware verifyToken sudah attach `req.user`

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { transactionDate: "desc" },
      include: {
        order: {
          select: {
            orderCode: true,
            visitDate: true,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: payments,
    });
  } catch (error) {
    console.error("Get user payments error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve user payments",
      error: error.message,
    });
  }
};
