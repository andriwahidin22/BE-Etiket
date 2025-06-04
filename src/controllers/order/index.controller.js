// src/controllers/order/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const generateTicketPDF = require("../../utils/generateTicketPDF");

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
        orderItems: { include: { ticket: true, ticketInstances: true } },
        user: { select: { id: true, fullName: true, email: true } },
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

    console.log("✅ Raw orderId from params:", id);

    if (!id || isNaN(Number(id))) {
      console.error("❌ orderId is invalid:", id);
      return res.status(400).json({ message: "Invalid orderId parameter" });
    }

    const orderId = parseInt(id);

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

    // ✅ Hindari error jika ticketInstances null/undefined
    const allTicketInstances = order.orderItems.flatMap(
      (item) => item.ticketInstances || []
    );

    const ticketsDir = path.join(__dirname, "../../../tickets");
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const pdfPath = path.join(ticketsDir, `${order.orderCode}_tickets.pdf`);

    // ✅ Pastikan parameter lengkap saat memanggil generateTicketPDF
    await generateTicketPDF(
      order,
      order.orderItems,
      allTicketInstances,
      order.user,
      pdfPath
    );

    // ✅ Kirim file ke browser
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
    const orders = await prisma.order.findMany({
      include: {
        orderItems: { include: { ticket: true, ticketInstances: true } },
        user: { select: { id: true, fullName: true, email: true } },
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
    console.log("=== START VALIDATION ===");
    console.log("📥 Full request received:", {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body
    });

    // Validasi input
    if (!req.body) {
      console.error("❌ Request body is missing");
      return res.status(400).json({ status: "error", message: "Request body diperlukan" });
    }

    const { qrCode, status } = req.body;
    console.log("🔍 Raw input data:", { qrCode, status });

    if (!qrCode) {
      console.error("❌ QR Code is required");
      return res.status(400).json({ status: "error", message: "QR code diperlukan" });
    }

    if (typeof qrCode !== "string") {
      console.error("❌ QR Code harus string, received:", typeof qrCode);
      return res.status(400).json({ status: "error", message: "Format QR code tidak valid" });
    }

    const cleanedQRCode = qrCode.trim();
    console.log("🧹 Cleaned QR Code:", `"${cleanedQRCode}"`, "Length:", cleanedQRCode.length);

    // Cek apakah QR Code ada di database
    console.log("🔎 Searching database for QR Code:", cleanedQRCode);
    const ticketInstance = await prisma.ticketInstance.findUnique({
      where: { qrCode: cleanedQRCode },
      include: {
        orderItem: {
          include: {
            order: true,
            ticket: true
          }
        }
      }
    });

    if (!ticketInstance) {
      console.error("❌ Ticket not found in database for QR:", cleanedQRCode);
      console.log("ℹ️ Sample QR codes in database:", 
        await prisma.ticketInstance.findMany({
          take: 5,
          select: { qrCode: true }
        }));
      return res.status(404).json({ 
        status: "error", 
        message: "Tiket tidak ditemukan",
        suggestion: "Pastikan QR code sudah terdaftar di sistem"
      });
    }

    console.log("✅ Ticket found:", {
      id: ticketInstance.id,
      currentStatus: ticketInstance.attendanceStatus,
      orderId: ticketInstance.orderItem?.order?.id,
      orderCode: ticketInstance.orderItem?.order?.orderCode,
      ticketType: ticketInstance.orderItem?.ticket?.type
    });

    // Validasi status
    if (!status) {
      console.error("❌ Status is required");
      return res.status(400).json({ status: "error", message: "Status diperlukan" });
    }

    const validStatuses = ["ARRIVED", "NOT_ARRIVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      console.error("❌ Invalid status:", status);
      return res.status(400).json({ 
        status: "error", 
        message: "Status tidak valid. Pilihan: ARRIVED, NOT_ARRIVED, CANCELLED"
      });
    }

    // Validasi bisnis
    if (ticketInstance.attendanceStatus === "ARRIVED" && status === "ARRIVED") {
      console.warn("⚠️ Ticket already arrived");
      return res.status(400).json({
        status: "error",
        message: "Tiket sudah dikonfirmasi hadir sebelumnya"
      });
    }

    if (ticketInstance.attendanceStatus === "CANCELLED") {
      console.warn("⚠️ Ticket is cancelled");
      return res.status(400).json({
        status: "error",
        message: "Tiket sudah dibatalkan"
      });
    }

    // Validasi tanggal
    const now = new Date();
    const visitDate = new Date(ticketInstance.orderItem.order.visitDate);
    console.log("📅 Date comparison:", {
      now: now.toISOString(),
      visitDate: visitDate.toISOString()
    });

    if (status === "ARRIVED" && now < visitDate) {
      console.warn("⏳ Cannot arrive before visit date");
      return res.status(400).json({
        status: "error",
        message: `Tidak bisa validasi kehadiran sebelum tanggal kunjungan (${visitDate.toLocaleDateString("id-ID")})`
      });
    }

    // Update database
    console.log("🔄 Updating ticket status to:", status);
    const updatedTicket = await prisma.ticketInstance.update({
      where: { id: ticketInstance.id },
      data: { attendanceStatus: status },
      include: {
        orderItem: {
          include: {
            order: true
          }
        }
      }
    });

    console.log("🎉 Successfully updated ticket:", {
      id: updatedTicket.id,
      newStatus: updatedTicket.attendanceStatus,
      orderCode: updatedTicket.orderItem.order.orderCode
    });

    return res.status(200).json({
      status: "success",
      message: `Status tiket berhasil diperbarui menjadi ${status}`,
      data: {
        ticketId: updatedTicket.id,
        qrCode: updatedTicket.qrCode,
        status: updatedTicket.attendanceStatus,
        orderCode: updatedTicket.orderItem.order.orderCode,
        visitDate: updatedTicket.orderItem.order.visitDate
      }
    });

  } catch (error) {
    console.error("🔥 Critical error:", {
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan server",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  } finally {
    console.log("=== END VALIDATION ===");
  }
};
