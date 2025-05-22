// controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("../../config/midtrans"); // Konfigurasi Midtrans
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generateTicketPDF = require("../../utils/generateTicketPDF");

/**
 * Fungsi untuk mengirim email dengan lampiran PDF tiket
 * @param {string} to - Email tujuan
 * @param {string} subject - Subjek email
 * @param {string} text - Isi email dalam bentuk teks
 * @param {string} attachmentPath - Path file PDF yang akan dilampirkan
 */
async function sendEmail(to, subject, text, attachmentPath) {
  // Membuat transporter nodemailer dengan konfigurasi Gmail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Email pengirim dari environment variable
      pass: process.env.EMAIL_PASS, // Password email pengirim dari environment variable
    },
  });

  // Opsi email yang akan dikirim
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename: path.basename(attachmentPath), // Nama file yang dilampirkan
        path: attachmentPath, // Lokasi file PDF
      },
    ],
  };

  // Kirim email
  await transporter.sendMail(mailOptions);
}

/**
 * Endpoint untuk memulai proses pembayaran
 * Menerima userId, daftar tiket, dan tanggal kunjungan
 * Menghitung total harga, membuat payment record dengan status PENDING,
 * lalu membuat transaksi di Midtrans dan mengembalikan token dan URL redirect.
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { userId, ticketList, visitDate } = req.body;

    // Validasi keberadaan user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let totalAmount = 0;
    const itemDetails = [];

    // Hitung total harga dan buat item details untuk Midtrans
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

      itemDetails.push({
        id: ticket.id.toString(),
        name: `${ticket.type} Ticket`,
        price: ticket.price,
        quantity: item.quantity,
      });
    }

    // Generate order ID unik untuk Midtrans
    const midtransOrderId = `MID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Simpan data payment dengan status PENDING
    const payment = await prisma.payment.create({
      data: {
        totalAmount,
        paymentStatus: "PENDING",
        midtransOrderId,
        transactionDate: new Date(),
        visitDate: new Date(visitDate),
        user: {
          connect: { id: userId },
        },
      },
    });

    // Parameter transaksi untuk Midtrans
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
      item_details: itemDetails,
    };

    // Buat transaksi di Midtrans
    const transaction = await snap.createTransaction(parameters);

    // Update payment dengan token dan redirect URL dari Midtrans
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });

    // Kirim response sukses dengan data transaksi
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

/**
 * Endpoint untuk menerima notifikasi dari Midtrans
 * Memproses status pembayaran, update status payment,
 * membuat order dan tiket jika pembayaran sukses,
 * generate PDF tiket dan kirim email ke user.
 */
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

    // Cek status transaksi di Midtrans, fallback ke body jika error
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
    } = statusResponse;

    let paymentStatus = payment.paymentStatus;
    let shouldCreateOrder = false;

    // Tentukan status payment berdasarkan status transaksi Midtrans
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

        // Ambil ticketList dari body notifikasi (pastikan dikirim dari client)
        // Catatan: Jika ticketList tidak dikirim di notifikasi, Anda perlu menyimpan data ini saat initiatePayment
        const ticketList = body.ticketList || [];

        // Buat order items dan ticket instances
        for (const item of ticketList) {
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

          // Buat ticket instances dengan QR code unik
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

        // Ambil order lengkap dengan item dan tiket
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

        // Buat folder tickets jika belum ada
        const ticketsDir = path.join(__dirname, "../../../tickets");
        if (!fs.existsSync(ticketsDir)) {
          fs.mkdirSync(ticketsDir, { recursive: true });
        }
        const pdfPath = path.join(ticketsDir, `${newOrder.orderCode}.pdf`);

        // Generate PDF tiket
        await generateTicketPDF(orderWithItems, orderWithItems.orderItems, payment.user, pdfPath);

        // Kirim email dengan lampiran tiket
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

/**
 * Endpoint untuk cek status pembayaran berdasarkan midtransOrderId
 * Mengembalikan status payment dan status transaksi Midtrans
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: orderId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

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
