// src/controllers/order/index.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");


// Fungsi generatePDF (sama seperti sebelumnya)
const generatePDF = async (order, orderItems, user, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [350, 150],
        layout: "landscape",
        margin: 15,
      });

      const writeStream = fs.createWriteStream(outputPath);
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(outputPath));
      doc.pipe(writeStream);

      const primaryColor = "#FFB81C";
      const darkColor = "#003366";
      const grayColor = "#666666";

      // Background putih dengan border rounded rectangle
      doc
        .rect(5, 5, doc.page.width - 10, doc.page.height - 10)
        .fill("#ffffff")
        .strokeColor(primaryColor)
        .lineWidth(2)
        .roundedRect(5, 5, doc.page.width - 10, doc.page.height - 10, 10)
        .stroke();

      // Header kiri: Judul tiket
      doc
        .fillColor(primaryColor)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("E-Ticket Museum Lampung", 20, 20, { width: 200 });

      // QR Code kanan atas
      const qrDataUrl = await QRCode.toDataURL(order.orderCode);
      const qrSize = 80;
      doc.image(qrDataUrl, doc.page.width - qrSize - 20, 15, { width: qrSize, height: qrSize });

      // Garis pemisah vertikal di tengah bawah QR
      doc
        .moveTo(doc.page.width - qrSize - 30, 15)
        .lineTo(doc.page.width - qrSize - 30, 15 + qrSize)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

      // Informasi order di bawah header (kiri bawah QR)
      const infoX = 20;
      const infoY = 60;
      doc
        .fillColor(darkColor)
        .fontSize(10)
        .font("Helvetica")
        .text(`Order Code: ${order.orderCode}`, infoX, infoY)
        .text(`Visitor: ${order.visitorName}`, infoX, infoY + 14)
        .text(
          `Visit Date: ${new Date(order.visitDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`,
          infoX,
          infoY + 28
        )
        .text(`Email: ${user.email}`, infoX, infoY + 42);

      // Garis horizontal pemisah
      const lineY = 110;
      doc
        .moveTo(15, lineY)
        .lineTo(doc.page.width - 15, lineY)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

      // Detail tiket (tabel sederhana) di bawah garis
      const tableStartY = lineY + 8;
      const colX = [20, 90, 180, 230, 300];
      const colHeaders = ["Code", "Type", "Qty", "Price", "Subtotal"];

      // Header tabel
      doc
        .fontSize(9)
        .fillColor(primaryColor)
        .font("Helvetica-Bold");
      colHeaders.forEach((header, i) => {
        doc.text(header, colX[i], tableStartY);
      });

      // Baris data tiket
      doc.font("Helvetica").fillColor(darkColor).fontSize(9);
      let total = 0;
      orderItems.forEach((item, idx) => {
        const y = tableStartY + 14 + idx * 12;
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.ticketPrice) || 0;
        const subtotal = quantity * price;
        total += subtotal;

        doc.text(item.ticket?.code || "N/A", colX[0], y);
        doc.text(item.ticket?.type || "N/A", colX[1], y);
        doc.text(quantity.toString(), colX[2], y, { width: 20, align: "right" });
        doc.text(price.toLocaleString("id-ID"), colX[3], y, { width: 50, align: "right" });
        doc.text(subtotal.toLocaleString("id-ID"), colX[4], y, { width: 50, align: "right" });
      });

      // Total harga di kanan bawah tabel
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(primaryColor)
        .text(`Total: Rp ${total.toLocaleString("id-ID")}`, doc.page.width - 120, tableStartY + 14 + orderItems.length * 12 + 6, {
          align: "right",
          width: 100,
        });

      // Footer kecil di bawah total
      doc
        .fontSize(7)
        .fillColor(grayColor)
        .font("Helvetica-Oblique")
        .text(
          "Harap tunjukkan tiket ini saat masuk ke Museum Lampung. Tiket hanya berlaku sesuai tanggal yang tertera.",
          20,
          doc.page.height - 25,
          { width: doc.page.width - 40, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};


// Fungsi kirim email
const sendEmail = async (to, subject, text, attachmentPath) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // contoh, sesuaikan dengan konfigurasi Anda
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

// GET ORDER BY ID (akses tanpa harus user pemilik, tapi bisa ditambahkan validasi jika perlu)
exports.getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ status: "error", message: "ID order tidak valid" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { ticket: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order tidak ditemukan" });
    }

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Get order by ID failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DOWNLOAD TICKET PDF berdasarkan order ID
exports.downloadTicket = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ status: "error", message: "ID order tidak valid" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { ticket: true } },
        user: { select: { email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order tidak ditemukan" });
    }

    // Buat folder tickets jika belum ada
    const ticketsDir = path.join(__dirname, '../../..', 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);

    // Jika file PDF belum ada, generate ulang
    if (!fs.existsSync(pdfPath)) {
      await generatePDF(order, order.orderItems, order.user, pdfPath);
    }

    res.setHeader('Content-Disposition', `attachment; filename=${order.orderCode}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Download ticket failed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// KIRIM ULANG TIKET KE EMAIL YANG DITENTUKAN
exports.resendTicket = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { email } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({ status: "error", message: "ID order tidak valid" });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ status: "error", message: "Email tidak valid" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { ticket: true } },
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order tidak ditemukan" });
    }

    // Buat folder tickets jika belum ada
    const ticketsDir = path.join(__dirname, '../../..', 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);

    // Jika file PDF belum ada, generate ulang
    if (!fs.existsSync(pdfPath)) {
      await generatePDF(order, order.orderItems, order.user, pdfPath);
    }

    // Kirim email ke alamat yang diminta
    await sendEmail(
      email,
      "E-Tiket Museum Lampung - Pengiriman Ulang",
      `Halo,\n\nBerikut adalah e-tiket untuk kunjungan pada ${order.visitDate.toLocaleDateString('id-ID')}.\n\nTerima kasih.`,
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

// Get All Orders
exports.getAllOrders = async (req, res) => {
  try {
    // Karena sudah dicek di middleware, tidak perlu cek role lagi di sini
    const orders = await prisma.order.findMany({
      include: {
        orderItems: { include: { ticket: true } },
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
      return res.status(400).json({ status: "error", message: "Kode pemesanan tidak valid" });
    }
    if (!["ARRIVED", "NOT_ARRIVED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ status: "error", message: "Status tidak valid" });
    }

    // Cari order berdasarkan orderCode
    const order = await prisma.order.findUnique({
      where: { orderCode },
    });

    if (!order) {
      return res.status(404).json({ status: "error", message: "Pemesanan tidak ditemukan" });
    }

    // Cek status saat ini
    if (order.attendanceStatus === "ARRIVED") {
      return res.status(400).json({ status: "error", message: "Pemesanan sudah dikonfirmasi hadir" });
    }
    if (order.attendanceStatus === "CANCELLED") {
      return res.status(400).json({ status: "error", message: "Pemesanan sudah dibatalkan" });
    }

    // Update status kehadiran
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

