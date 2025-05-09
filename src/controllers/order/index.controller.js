const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

// Fungsi untuk membuat PDF tiket
const generatePDF = async (order, orderItems, outputPath) => {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  doc.fontSize(18).text("E-Ticket Museum", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Order Code: ${order.orderCode}`);
  doc.text(`Visitor Name: ${order.visitorName}`);
  doc.text(`Visit Date: ${order.visitDate.toDateString()}`);
  doc.moveDown();

  doc.text("Tickets:");
  orderItems.forEach((item) => {
    doc.text(`- ${item.ticket.name} x${item.quantity} @Rp${item.ticketPrice}`);
  });

  doc.end();
};

// Fungsi untuk kirim email
const sendEmail = async (to, subject, text, attachmentPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"E-Tiket Museum" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    attachments: [{ filename: path.basename(attachmentPath), path: attachmentPath }],
  });
};

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { visitorName, ticketList, visitDate } = req.body;
    const userId = req.user.id; // ambil dari token yang sudah diverifikasi

    // Validasi input
    if (!visitorName || !visitDate || !ticketList || ticketList.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedDate = new Date(visitDate);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid visitDate format. Use YYYY-MM-DD" });
    }

    // Periksa user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

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

    const orderItems = [];
    for (let ticketData of ticketList) {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketData.ticketId } });
      if (!ticket) continue;

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ticketId: ticket.id,
          quantity: ticketData.quantity,
          ticketPrice: ticket.price,
        },
        include: { ticket: true },
      });

      orderItems.push(orderItem);
    }

    // Pastikan folder tiket tersedia
    const ticketsDir = path.join(__dirname, "../../../tickets");
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    // Buat PDF
    const pdfPath = path.join(ticketsDir, `${order.orderCode}.pdf`);
    await generatePDF(order, orderItems, pdfPath);

    // Kirim email
    await sendEmail(user.email, "E-Tiket Museum", "Berikut adalah e-tiket Anda.", pdfPath);

    res.status(201).json({
      status: "success",
      message: "Order created and email sent successfully",
      data: order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create order",
      error: error.message,
    });
  }
};


// GET ALL ORDERS
exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { orderItems: { include: { ticket: true } }, user: true },
    });
    res.status(200).json({
      status: "success",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { orderItems: { include: { ticket: true } } },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
