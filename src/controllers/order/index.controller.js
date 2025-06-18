// src/controllers/order/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const generateTicketPDF = require("../../utils/generateTicketPDF");
const jwt = require("jsonwebtoken");

// Fungsi kirim email dengan lampiran PDF tiket
const sendEmail = async (to, subject, text, attachmentPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Sesuaikan dengan konfigurasi email Anda
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
};

// Mendapatkan detail order berdasarkan ID
exports.getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID order tidak valid" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            ticket: true,
            ticketInstances: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        payment: {
          select: {
            id: true,
            totalAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            transactionDate: true,
            settlementTime: true,
          },
        },
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order tidak ditemukan" });
    }

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Get order by ID failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Download PDF tiket berdasarkan order ID, hanya untuk pemilik order
exports.downloadTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    console.log("✅ Raw orderId from params:", id);

    // Validasi parameter order ID
    if (!id || isNaN(Number(id))) {
      console.error("❌ orderId is invalid:", id);
      return res.status(400).json({ message: "Invalid orderId parameter" });
    }

    // Validasi token
    if (!token) {
      console.error("❌ Token tidak ditemukan di query parameter");
      return res.status(401).json({ message: "Token is required" });
    }

    console.log("Tokens: ", token);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ Token tidak valid:", err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const orderId = parseInt(id);

    // Cari order dan sertakan data user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            ticket: true,
            ticketInstances: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      console.error("❌ Order not found for id:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ Perbaikan di sini: validasi user pemilik order
    if (order.userId !== decoded.id) {
      console.error("❌ Unauthorized: Token tidak cocok dengan pemilik order");
      return res
        .status(403)
        .json({ message: "You are not authorized to download this ticket" });
    }

    const allTicketInstances = order.orderItems.flatMap(
      (item) => item.ticketInstances || []
    );

    const ticketsDir = path.join(__dirname, "../../../tickets");
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const pdfPath = path.join(ticketsDir, `${order.orderCode}_tickets.pdf`);

    await generateTicketPDF(
      order,
      order.orderItems,
      allTicketInstances,
      order.user,
      pdfPath
    );

    // Debug
    console.log("User after decode:", decoded);

    // Download PDF
    res.download(pdfPath, `${order.orderCode}_tickets.pdf`, (err) => {
      if (err) {
        console.error("❌ Download ticket failed:", err);
        res
          .status(500)
          .json({ status: "error", message: "Failed to download ticket PDF" });
      }
    });
  } catch (error) {
    console.error("❌ Download ticket failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Kirim ulang tiket ke email, hanya untuk pemilik order
exports.resendTicket = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { email } = req.body;
    const userId = req.user.id; // asumsi sudah ada dari middleware auth

    if (isNaN(orderId)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID order tidak valid" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res
        .status(400)
        .json({ status: "error", message: "Email tidak valid" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { ticket: true, ticketInstances: true } },
        user: { select: { id: true, fullName: true, email: true } },
        payment: true,
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order tidak ditemukan" });
    }

    // Cek apakah pemilik order sama dengan user yang request
    if (order.user.id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Anda tidak memiliki akses untuk mengirim ulang tiket ini",
      });
    }

    // Pastikan folder tickets ada
    const ticketsDir = path.join(__dirname, "../../..", "tickets");
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);

    // Generate ulang PDF tiket agar desain terbaru selalu dipakai
    const allTicketInstances = order.orderItems.flatMap(
      (item) => item.ticketInstances
    );
    await generateTicketPDF({
      order,
      orderItems,
      ticketInstances,
      user,
      outputPath,
    });

    // Kirim email ke alamat yang diminta dengan lampiran tiket
    await sendEmail(
      email,
      "E-Tiket Museum Lampung - Pengiriman Ulang",
      `Halo,\n\nBerikut adalah e-tiket untuk kunjungan pada ${order.visitDate.toLocaleDateString(
        "id-ID"
      )}.\n\nTerima kasih.`,
      pdfPath
    );

    res.status(200).json({
      status: "success",
      message: `Tiket berhasil dikirim ulang ke email: ${email}`,
    });
  } catch (error) {
    console.error("Resend ticket failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Mendapatkan semua order (misal untuk admin)
exports.getAllOrders = async (req, res) => {
  try {
    let whereCondition = {};

    // Jika bukan admin, hanya ambil pesanan milik pengguna yang sedang login
    if (req.user.role !== "ADMIN") {
      whereCondition = { userId: req.user.id };
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderItems: {
          include: {
            ticket: true,
            ticketInstances: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        payment: {
          select: {
            id: true,
            totalAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            transactionDate: true,
            settlementTime: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    console.error("Get all orders failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Validasi kehadiran berdasarkan kode pemesanan (orderCode)
exports.validateOrderByCode = async (req, res) => {
  try {
    const { orderCode, status } = req.body;

    if (!orderCode || typeof orderCode !== "string") {
      return res
        .status(400)
        .json({ status: "error", message: "Kode pemesanan tidak valid" });
    }
    if (!["ARRIVED", "NOT_ARRIVED", "CANCELLED"].includes(status)) {
      return res
        .status(400)
        .json({ status: "error", message: "Status tidak valid" });
    }

    // Cari order berdasarkan orderCode
    const order = await prisma.order.findUnique({
      where: { orderCode },
    });

    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Pemesanan tidak ditemukan" });
    }

    // Cek status saat ini agar tidak duplikat update
    if (order.attendanceStatus === "ARRIVED") {
      return res.status(400).json({
        status: "error",
        message: "Pemesanan sudah dikonfirmasi hadir",
      });
    }
    if (order.attendanceStatus === "CANCELLED") {
      return res
        .status(400)
        .json({ status: "error", message: "Pemesanan sudah dibatalkan" });
    }

    // Validasi tanggal kunjungan untuk status ARRIVED
    if (status === "ARRIVED") {
      const now = new Date();
      const visitDate = new Date(order.visitDate);

      // Bandingkan hanya tanggal tanpa waktu
      const nowDateOnly = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const visitDateOnly = new Date(
        visitDate.getFullYear(),
        visitDate.getMonth(),
        visitDate.getDate()
      );

      if (nowDateOnly < visitDateOnly) {
        return res.status(400).json({
          status: "error",
          message: `Status tidak bisa diubah menjadi hadir sebelum tanggal kunjungan (${visitDateOnly.toLocaleDateString(
            "id-ID"
          )})`,
        });
      }
    }

    // Update status kehadiran order
    const updatedOrder = await prisma.order.update({
      where: { orderCode },
      data: { attendanceStatus: status },
    });

    res.status(200).json({
      status: "success",
      message: `Status kehadiran pemesanan ${orderCode} berhasil diperbarui menjadi ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Validate order by code failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Validasi kehadiran berdasarkan QR Code
exports.validateAttendanceByQRCode = async (req, res) => {
  try {
    if (!req.body) {
      console.error("❌ Request body is missing");
      return res
        .status(400)
        .json({ status: "error", message: "Request body diperlukan" });
    }

    const { qrCode, status } = req.body;

    if (!qrCode || typeof qrCode !== "string") {
      console.error("❌ QR Code is invalid:", qrCode);
      return res
        .status(400)
        .json({ status: "error", message: "QR code tidak valid" });
    }

    const cleanedQRCode = qrCode.trim();

    const ticketInstance = await prisma.ticketInstance.findUnique({
      where: { qrCode: cleanedQRCode },
      include: {
        orderItem: {
          include: {
            order: true,
            ticket: true,
          },
        },
      },
    });

    if (!ticketInstance) {
      const sampleQRs = await prisma.ticketInstance.findMany({
        take: 3,
        select: { qrCode: true },
      });
      console.error(
        "❌ Ticket not found. QR:",
        cleanedQRCode,
        "Examples:",
        sampleQRs
      );
      return res.status(404).json({
        status: "error",
        message: "Tiket tidak ditemukan",
        suggestion: "Pastikan QR code sudah terdaftar di sistem",
      });
    }

    const order = ticketInstance.orderItem?.order;
    if (!order) {
      console.error("❌ Order tidak ditemukan di relasi OrderItem");
      return res.status(400).json({
        status: "error",
        message: "ID order tidak valid (relasi order tidak ditemukan)",
      });
    }

    const validStatuses = ["ARRIVED", "NOT_ARRIVED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status tidak valid. Pilihan: ARRIVED, NOT_ARRIVED, CANCELLED",
      });
    }

    if (ticketInstance.attendanceStatus === "ARRIVED" && status === "ARRIVED") {
      return res.status(400).json({
        status: "error",
        message: "Tiket sudah dikonfirmasi hadir sebelumnya",
      });
    }

    if (ticketInstance.attendanceStatus === "CANCELLED") {
      return res.status(400).json({
        status: "error",
        message: "Tiket sudah dibatalkan",
      });
    }

    const now = new Date();
    const visitDate = new Date(order.visitDate);

    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

    const dayDiff = Math.floor((nowDateOnly - visitDateOnly) / (1000 * 60 * 60 * 24));

    if (status === "ARRIVED") {
      if (dayDiff < 0) {
        return res.status(400).json({
          status: "error",
          message: `Tidak bisa validasi kehadiran sebelum tanggal kunjungan (${visitDateOnly.toLocaleDateString("id-ID")})`,
        });
      }

      if (dayDiff > 0) {
        return res.status(400).json({
          status: "error",
          message: `Tiket sudah kedaluwarsa. Kehadiran hanya bisa divalidasi pada tanggal kunjungan (${visitDateOnly.toLocaleDateString("id-ID")})`,
        });
      }
    }

    const updatedTicket = await prisma.ticketInstance.update({
      where: { id: ticketInstance.id },
      data: { attendanceStatus: status },
      include: {
        orderItem: {
          include: {
            order: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: "success",
      message: `Status tiket berhasil diperbarui menjadi ${status}`,
      data: {
        ticketId: updatedTicket.id,
        qrCode: updatedTicket.qrCode,
        status: updatedTicket.attendanceStatus,
        orderCode: updatedTicket.orderItem.order.orderCode,
        visitDate: updatedTicket.orderItem.order.visitDate,
      },
    });
  } catch (error) {
    console.error("🔥 Server error:", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Mendapatkan semua ticket instances (untuk admin/buyer)
exports.getAllTicketInstances = async (req, res) => {
  try {
    let whereCondition = {};

    // Jika bukan admin, hanya ambil ticket instances milik user
    if (req.user.role !== "ADMIN") {
      whereCondition = {
        orderItem: {
          order: {
            userId: req.user.id,
          },
        },
      };
    }

    const ticketInstances = await prisma.ticketInstance.findMany({
      where: whereCondition,
      include: {
        orderItem: {
          include: {
            ticket: true, // Relasi ke Ticket
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
                payment: {
                  select: {
                    id: true,
                    totalAmount: true,
                    paymentStatus: true,
                    paymentMethod: true,
                    transactionDate: true,
                    settlementTime: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: ticketInstances,
    });
  } catch (error) {
    console.error("Get all ticket instances failed:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Mendapatkan ticket instance berdasarkan ID
exports.getTicketInstanceById = async (req, res) => {
  try {
    const ticketInstanceId = parseInt(req.params.id);

    if (isNaN(ticketInstanceId)) {
      return res.status(400).json({
        status: "error",
        message: "ID ticket instance tidak valid",
      });
    }

    const ticketInstance = await prisma.ticketInstance.findUnique({
      where: { id: ticketInstanceId },
      include: {
        orderItem: {
          include: {
            order: true,
            ticket: true,
          },
        },
      },
    });

    if (!ticketInstance) {
      return res.status(404).json({
        status: "error",
        message: "Ticket instance tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "success",
      data: ticketInstance,
    });
  } catch (error) {
    console.error("Get ticket instance by ID failed:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
