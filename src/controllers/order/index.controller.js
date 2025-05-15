// src/controllers/order/index.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

// Fungsi generatePDF dengan validasi dan format rapi
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

// Fungsi kirim email (pastikan Anda punya fungsi ini, contoh sederhana)
const sendEmail = async (to, subject, text, attachmentPath) => {
  // Konfigurasi transporter sesuai kebutuhan Anda
  const transporter = nodemailer.createTransport({
    service: 'gmail', // contoh
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

// Prisma Middleware untuk kirim email otomatis saat ada order baru
prisma.$use(async (params, next) => {
  if (params.model === "Order" && params.action === "create") {
    // Jalankan proses create order dulu
    const result = await next(params);

    try {
      // Ambil data order lengkap dengan orderItems dan user
      const order = await prisma.order.findUnique({
        where: { id: result.id },
        include: {
          orderItems: { include: { ticket: true } },
          user: true,
        },
      });

      // Buat folder tickets jika belum ada
      const ticketsDir = path.join(__dirname, '../../..', 'tickets');
      if (!fs.existsSync(ticketsDir)) {
        fs.mkdirSync(ticketsDir, { recursive: true });
      }

      // Generate PDF tiket
      const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);
      await generatePDF(order, order.orderItems, order.user, pdfPath);

      // Kirim email otomatis
      await sendEmail(
        order.user.email,
        "E-Tiket Museum Lampung",
        `Halo ${order.user.fullName},\n\nBerikut adalah e-tiket Anda untuk kunjungan pada ${order.visitDate.toLocaleDateString('id-ID')}.`,
        pdfPath
      );

      console.log(`Email otomatis terkirim untuk order ${order.orderCode}`);
    } catch (err) {
      console.error("Gagal mengirim email otomatis:", err);
    }

    return result;
  }

  // Untuk operasi lain, lanjutkan normal
  return next(params);
});

// CREATE ORDER dengan validasi dan generate PDF sesuai format
exports.createOrder = async (req, res) => {
  try {
    const { visitorName, ticketList, visitDate } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (!visitorName || typeof visitorName !== 'string' || visitorName.trim() === '') {
      return res.status(400).json({ message: "Nama pengunjung harus diisi" });
    }
    if (!visitDate) {
      return res.status(400).json({ message: "Tanggal kunjungan harus diisi" });
    }
    if (!ticketList || !Array.isArray(ticketList) || ticketList.length === 0) {
      return res.status(400).json({ message: "Daftar tiket tidak valid" });
    }

    const parsedDate = new Date(visitDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Format tanggal tidak valid" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return res.status(400).json({ message: "Tanggal kunjungan tidak boleh di masa lalu" });
    }

    // Ambil data user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true }
    });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    // Validasi dan ambil data tiket lengkap
    const validatedTickets = [];
    for (const ticketData of ticketList) {
      const ticketId = parseInt(ticketData.ticketId);
      const quantity = parseInt(ticketData.quantity);

      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(400).json({ message: `ID tiket tidak valid: ${ticketData.ticketId}` });
      }
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: `Jumlah tiket tidak valid: ${ticketData.quantity}` });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, code: true, type: true, price: true }
      });
      if (!ticket) {
        return res.status(404).json({ message: `Tiket dengan ID ${ticketId} tidak ditemukan` });
      }
      if (typeof ticket.price !== 'number' || isNaN(ticket.price) || ticket.price < 0) {
        return res.status(400).json({ message: `Harga tiket tidak valid: ${ticket.price}` });
      }
      validatedTickets.push({
        ticketId: ticket.id,
        quantity,
        ticketPrice: ticket.price,
        ticket
      });
    }

    // Buat order
    const orderCode = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderCode,
        visitorName,
        visitDate: parsedDate,
        userId,
      },
    });

    // Buat order items dan sertakan data tiket
    const orderItems = [];
    for (const ticketData of validatedTickets) {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ticketId: ticketData.ticketId,
          quantity: ticketData.quantity,
          ticketPrice: ticketData.ticketPrice,
        },
      });
      orderItems.push({
        ...orderItem,
        ticket: ticketData.ticket
      });
    }

    // Buat folder tickets jika belum ada
    const ticketsDir = path.join(__dirname, '../../..', 'tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    // Generate PDF tiket
    const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);
    await generatePDF(order, orderItems, user, pdfPath);

    // Kirim email dengan lampiran PDF
    await sendEmail(
      user.email,
      "E-Tiket Museum Lampung",
      `Halo ${user.fullName},\n\nBerikut adalah e-tiket Anda untuk kunjungan pada ${parsedDate.toLocaleDateString('id-ID')}.`,
      pdfPath
    );

    // Response sukses
    res.status(201).json({
      status: "success",
      message: "Order berhasil dibuat",
      data: {
        orderCode: order.orderCode,
        pdfUrl: `/tickets/${order.orderCode}.pdf`,
        visitDate: parsedDate.toISOString(),
        totalItems: orderItems.length,
        totalAmount: orderItems.reduce((sum, item) => sum + (item.quantity * item.ticketPrice), 0)
      }
    });

  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal membuat order",
      error: error.message
    });
  }
};

// GET ALL ORDERS
exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: { ticket: true }
        },
        user: true
      },
    });
    res.status(200).json({
      status: "success",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message
    });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orderItems: {
          include: { ticket: true }
        }
      },
    });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: order
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message
    });
  }
};
