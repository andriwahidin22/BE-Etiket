// src/utils/pdfGenerator.js
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function generateTicketPDF(order, user, tickets) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    console.log("Tickets Data:", tickets); // Debugging: cek data tiket

    // Tema warna
    const primaryColor = "#FFB81C"; // warna emas
    const accentColor = "#FC6C25";  // oranye
    const darkColor = "#003366";    // gelap untuk teks utama

    // Header
    doc.fillColor(primaryColor).fontSize(24).text("🎫 Museum E-Ticket", {
      align: "center",
      underline: true
    });

    doc.moveDown();
    doc.fontSize(14).fillColor(darkColor).text(`Order Code: ${order.orderCode}`);
    doc.text(`Visitor Name: ${order.visitorName}`);
    doc.text(`Visit Date: ${new Date(order.visitDate).toLocaleDateString()}`);
    doc.text(`Email: ${user.email}`);

    doc.moveDown();

    // QR Code
    const qrData = await QRCode.toDataURL(order.orderCode);
    doc.image(qrData, doc.page.width - 150, 120, { width: 100 });

    // Tabel Detil Tiket
    doc.moveDown().moveDown();
    doc.fillColor(primaryColor).fontSize(18).text("🎟 Ticket Details", { underline: true });
    doc.moveDown(0.5);

    // Debugging: cek data tiket per baris
    tickets.forEach((item, index) => {
      console.log(`Ticket ${index + 1}:`, item);
    });

    // Drawing Table Header
    const tableTop = doc.y;
    const rowHeight = 20;
    const columnWidth = [100, 200, 100, 100]; // Adjust for 4 columns
    const tableData = tickets.map(item => [
      item.ticket?.type || "No Type", 
      item.ticket?.name || "No Name", 
      item.quantity || 0,
      `Rp ${item.ticket?.price?.toLocaleString() || 0}`, 
    ]);

    // Column Headers
    doc.fontSize(12).fillColor(darkColor)
      .text("Type", columnWidth[0], tableTop)
      .text("Name", columnWidth[0] + columnWidth[1], tableTop)
      .text("Quantity", columnWidth[0] + columnWidth[1] + columnWidth[2], tableTop)
      .text("Price", columnWidth[0] + columnWidth[1] + columnWidth[2] + columnWidth[3], tableTop);

    doc.moveDown();

    // Table Rows
    tableData.forEach((row, index) => {
      const y = tableTop + (index + 1) * rowHeight;
      doc.fontSize(10).fillColor("black")
        .text(row[0], columnWidth[0], y)
        .text(row[1], columnWidth[0] + columnWidth[1], y)
        .text(row[2], columnWidth[0] + columnWidth[1] + columnWidth[2], y)
        .text(row[3], columnWidth[0] + columnWidth[1] + columnWidth[2] + columnWidth[3], y);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text(
      "Harap tunjukkan tiket ini saat masuk. Tiket hanya berlaku pada tanggal yang tertera.",
      { align: "center" }
    );

    doc.end();
  });
}

module.exports = generateTicketPDF;
