// src/controllers/order/index.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

// Fungsi generatePDF (sama seperti sebelumnya)
const generatePDF = async (order, orderItems, user, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      writeStream.on('error', reject);
      writeStream.on('finish', () => resolve(outputPath));
      doc.pipe(writeStream);

      // Header
      doc.fontSize(18).text("E-Ticket Museum Lampung", { align: "center" });
      doc.moveDown();

      // Informasi Order
      doc.fontSize(12)
        .text(`Order Code: ${order.orderCode}`)
        .text(`Visitor Name: ${order.visitorName}`)
        .text(`Visit Date: ${order.visitDate.toDateString()}`)
        .text(`Email: ${user.email}`);
      doc.moveDown();

      // Header Detail Tiket
      doc.fontSize(14).text("🎟 Ticket Details", { underline: true });
      doc.moveDown(0.5);

      // Header Tabel
      const tableHeaders = ["Code", "Type", "Qty", "Price", "Subtotal"];
      const columnPositions = [50, 150, 350, 420, 500];
      doc.fontSize(12).font('Helvetica-Bold');
      tableHeaders.forEach((header, i) => {
        doc.text(header, columnPositions[i], doc.y);
      });
      doc.moveDown();

      // Isi Tabel
      let y = doc.y;
      let total = 0;
      doc.font('Helvetica');
      orderItems.forEach(item => {
        const ticketCode = item.ticket?.code || "UNKN";
        const ticketType = item.ticket?.type || "Unknown";
        const quantity = Number(item.quantity);
        const price = Number(item.ticketPrice);
        const subtotal = quantity * price;

        if (isNaN(quantity) || isNaN(price) || isNaN(subtotal)) {
          throw new Error(`Invalid numeric value in ticket item: ${JSON.stringify(item)}`);
        }
        total += subtotal;

        const priceStr = `Rp ${price.toLocaleString('id-ID')}`;
        const subtotalStr = `Rp ${subtotal.toLocaleString('id-ID')}`;

        doc.text(ticketCode, columnPositions[0], y)
          .text(ticketType, columnPositions[1], y)
          .text(quantity.toString(), columnPositions[2], y, { width: 50, align: 'right' })
          .text(priceStr, columnPositions[3], y, { width: 70, align: 'right' })
          .text(subtotalStr, columnPositions[4], y, { width: 80, align: 'right' });

        y += 20; // jarak antar baris
      });

      const totalStr = `Rp ${total.toLocaleString('id-ID')}`;
      doc.moveDown(2)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Total: ${totalStr}`, { align: "right" });

      // Footer
      doc.moveDown(2)
        .fontSize(10)
        .text("* Harap tunjukkan tiket ini saat masuk ke Museum Lampung.", { align: "center" });

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


