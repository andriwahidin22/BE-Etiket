const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function generateTicketPDF(order, user, tickets) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument();
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Header
    doc.fontSize(20).text("🎫 Museum E-Ticket", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order Code: ${order.orderCode}`);
    doc.text(`Visitor: ${order.visitorName}`);
    doc.text(`Visit Date: ${new Date(order.visitDate).toDateString()}`);
    doc.moveDown();

    // QR Code
    const qrData = await QRCode.toDataURL(order.orderCode);
    doc.image(qrData, { fit: [100, 100] });

    doc.moveDown();
    doc.fontSize(14).text("Tickets", { underline: true });
    tickets.forEach((item, i) => {
      doc.text(
        `${i + 1}. ${item.ticket.type} - Qty: ${item.quantity} x Rp${item.ticket.price}`
      );
    });

    doc.end();
  });
}

module.exports = generateTicketPDF;
