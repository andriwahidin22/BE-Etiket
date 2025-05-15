// controllers/payment/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { snap, core } = require("../../config/midtrans");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

// Fungsi generate PDF tiket
async function generatePDF(order, orderItems, user, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(outputPath));
      doc.pipe(writeStream);

      doc.fontSize(18).text("E-Ticket Museum Lampung", { align: "center" });
      doc.moveDown();

      doc.fontSize(12)
        .text(`Order Code: ${order.orderCode}`)
        .text(`Visitor Name: ${order.visitorName}`)
        .text(`Visit Date: ${order.visitDate.toLocaleDateString("id-ID")}`)
        .text(`Email: ${user.email}`);
      doc.moveDown();

      doc.fontSize(14).text("🎟 Ticket Details", { underline: true });
      doc.moveDown(0.5);

      const tableHeaders = ["Code", "Type", "Qty", "Price", "Subtotal"];
      const columnPositions = [50, 150, 350, 420, 500];
      doc.fontSize(12).font("Helvetica-Bold");
      tableHeaders.forEach((header, i) => {
        doc.text(header, columnPositions[i], doc.y);
      });
      doc.moveDown();

      let y = doc.y;
      let total = 0;
      doc.font("Helvetica");
      orderItems.forEach((item) => {
        const ticketCode = item.ticket?.code || "UNKN";
        const ticketType = item.ticket?.type || "Unknown";
        const quantity = Number(item.quantity);
        const price = Number(item.ticketPrice);
        const subtotal = quantity * price;

        const priceStr = `Rp ${price.toLocaleString("id-ID")}`;
        const subtotalStr = `Rp ${subtotal.toLocaleString("id-ID")}`;

        doc
          .text(ticketCode, columnPositions[0], y)
          .text(ticketType, columnPositions[1], y)
          .text(quantity.toString(), columnPositions[2], y, { width: 50, align: "right" })
          .text(priceStr, columnPositions[3], y, { width: 70, align: "right" })
          .text(subtotalStr, columnPositions[4], y, { width: 80, align: "right" });

        y += 20;
        total += subtotal;
      });

      const totalStr = `Rp ${total.toLocaleString("id-ID")}`;
      doc.moveDown(2).fontSize(12).font("Helvetica-Bold").text(`Total: ${totalStr}`, { align: "right" });

      doc.moveDown(2).fontSize(10).text("* Harap tunjukkan tiket ini saat masuk ke Museum Lampung.", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Fungsi kirim email dengan lampiran PDF
async function sendEmail(to, subject, text, attachmentPath) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
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

// Initiate Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { userId, ticketList, visitDate } = req.body;

    // Validate user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total amount
    let totalAmount = 0;
    const ticketDetails = [];
    
    for (const item of ticketList) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: item.ticketId },
        select: { id: true, code: true, type: true, price: true }
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
        transactionDate: new Date(),
        userId: userId,
        visitDate: new Date(visitDate)
      }
    });

    // Prepare Midtrans parameters
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
      item_details: ticketDetails.map(ticket => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity
      }))
    };

    // Create Snap transaction
    const transaction = await snap.createTransaction(parameters);
    
    // Update payment with snap token
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url
      }
    });

    res.status(201).json({
      status: "success",
      message: "Payment initiated",
      data: {
        paymentId: payment.id,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        midtransOrderId
      }
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
      where: { midtransOrderId: orderId },
      include: { order: true }
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
