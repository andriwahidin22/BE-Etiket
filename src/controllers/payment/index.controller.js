// controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("../../config/midtrans"); // Konfigurasi Midtrans Anda
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generateTicketPDF = require("../../utils/generateTicketPDF");

// Fungsi kirim email dengan lampiran PDF tiket
async function sendEmail(to, subject, text, attachmentPath) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Gunakan layanan email Anda
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(attachmentPath),
        path: attachmentPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}

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
        return res.status(400).json({ message: `Ticket ${item.ticketId} not found` });
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
    const midtransOrderId = `MID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Simpan record payment dengan status PENDING
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus: "PENDING",
        midtransOrderId,
        transactionDate: new Date(),
        userId: userId,
        visitDate: new Date(visitDate),
        // Simpan detail tiket sebagai JSON string agar bisa dipakai saat notifikasi
        // Jika Anda ingin, bisa buat field baru di model payment untuk ini
        // Contoh: ticketDetails: JSON.stringify(ticketList)
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

    // Cari payment berdasarkan midtransOrderId
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

    // Coba ambil status transaksi dari Midtrans Core API
    let statusResponse;
    try {
      statusResponse = await core.transaction.status(order_id);
    } catch (err) {
      // Jika gagal, gunakan data notifikasi langsung
      statusResponse = body;
    }

    const {
      transaction_status,
      fraud_status,
      payment_type,
      settlement_time,
    } = statusResponse;

    let paymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    // Tentukan status pembayaran dan apakah perlu buat order
    if (transaction_status === "capture") {
      paymentStatus = fraud_status === "challenge" ? "CHALLENGE" : "SUCCESS";
      if (paymentStatus === "SUCCESS") shouldCreateOrder = true;
    } else if (transaction_status === "settlement") {
      paymentStatus = "SUCCESS";
      shouldCreateOrder = true;
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      paymentStatus = "FAILED";
    }

    // Update status payment di database
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus,
        paymentMethod: payment_type,
        settlementTime: settlement_time ? new Date(settlement_time) : null,
        updatedAt: new Date(),
      },
    });

    // Jika pembayaran sukses dan order belum dibuat, buat order dan tiket
    if (shouldCreateOrder && !payment.order) {
      await prisma.$transaction(async (tx) => {
        // Buat order baru
        const newOrder = await tx.order.create({
          data: {
            orderCode: `ORD-${Date.now()}`,
            visitorName: payment.user?.fullName || "Customer",
            visitDate: payment.visitDate || new Date(),
            userId: payment.userId,
            payment: { connect: { id: payment.id } },
          },
        });

        // Ambil detail tiket yang dibeli dari payment (Anda bisa simpan di payment saat initiate)
        // Contoh fallback jika tidak ada data tiket di payment:
        const purchasedTickets = payment.ticketDetails || [
          { ticketId: 1, quantity: 1 },
        ];

        // Buat order item dan ticket instance sesuai quantity tiket
        for (const item of purchasedTickets) {
          const ticket = await tx.ticket.findUnique({ where: { id: item.ticketId } });
          if (!ticket) continue;

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ticketId: ticket.id,
              quantity: item.quantity,
              ticketPrice: ticket.price,
            },
          });

          // Buat ticket instance (fisik tiket) dengan QR code unik
          for (let i = 0; i < item.quantity; i++) {
            const qrCode = `TICKET-${orderItem.id}-${i}-${Date.now()}`;
            await tx.ticketInstance.create({
              data: {
                orderItemId: orderItem.id,
                qrCode,
                attendanceStatus: "NOT_ARRIVED",
              },
            });
          }
        }

        // Ambil order lengkap dengan ticket instances untuk generate PDF
        const orderWithItems = await tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            orderItems: {
              include: {
                ticket: true,
                ticketInstances: true,
              },
            },
          },
        });

        // Pastikan folder tickets ada
        const ticketsDir = path.join(__dirname, "../../../tickets");
        if (!fs.existsSync(ticketsDir)) {
          fs.mkdirSync(ticketsDir, { recursive: true });
        }
        const pdfPath = path.join(ticketsDir, `${newOrder.orderCode}.pdf`);

        // Kumpulkan semua ticket instances dari semua order items
        const allTicketInstances = orderWithItems.orderItems.flatMap(
          (item) => item.ticketInstances
        );

        // Generate PDF tiket dengan QR code unik tiap tiket
        await generateTicketPDF(orderWithItems, allTicketInstances, payment.user, pdfPath);

        // Kirim email dengan lampiran PDF tiket
        await sendEmail(
          payment.user.email,
          "E-Tiket Museum Lampung",
          `Halo ${payment.user.fullName},\n\nPembayaran Anda telah berhasil. Berikut adalah e-tiket Anda untuk kunjungan pada ${new Date(
            orderWithItems.visitDate
          ).toLocaleDateString("id-ID")}.`,
          pdfPath
        );
      });
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
      orderBy: { transactionDate: 'desc' },
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
          }
        }
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
