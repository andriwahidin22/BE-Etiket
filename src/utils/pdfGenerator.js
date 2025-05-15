const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

/**
 * Fungsi generateTicketPDF
 * Membuat file PDF e-ticket dengan layout rapi dan data lengkap
 * @param {Object} order - Data order (orderCode, visitorName, visitDate, dll)
 * @param {Object} user - Data user (email, dll)
 * @param {Array} tickets - Array orderItems dengan detail tiket (code, type, price, quantity)
 * @returns {Promise<Buffer>} - Buffer PDF yang sudah dibuat
 */
async function generateTicketPDF(order, user, tickets) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);

        // Simpan file PDF ke folder ticket (buat folder jika belum ada)
        const ticketDir = path.join(__dirname, "..", "..", "ticket");
        if (!fs.existsSync(ticketDir)) {
          fs.mkdirSync(ticketDir, { recursive: true });
        }

        const filePath = path.join(ticketDir, `ticket-${order.orderCode}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);

        resolve(pdfBuffer);
      });

      // Warna utama dan sekunder
      const primaryColor = "#FFB81C";
      const darkColor = "#003366";

      // Header utama
      doc
        .fillColor(primaryColor)
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("E-Ticket Museum Lampung", {
          align: "center",
          underline: true,
        });

      doc.moveDown();

      // Informasi order dan user
      doc
        .fontSize(14)
        .fillColor(darkColor)
        .font("Helvetica")
        .text(`Order Code: ${order.orderCode}`)
        .text(`Visitor Name: ${order.visitorName}`)
        .text(`Visit Date: ${new Date(order.visitDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`)
        .text(`Email: ${user.email}`);

      // QR Code di kanan atas
      const qrData = await QRCode.toDataURL(order.orderCode);
      doc.image(qrData, doc.page.width - 150, 110, { width: 100 });

      doc.moveDown(2);

      // Judul Ticket Details
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Ticket Details", {
          underline: true,
        });

      // Posisi dan ukuran kolom
      const startX = 50;
      const startY = doc.y + 10;
      const lineHeight = 20;
      const colPositions = {
        code: startX,
        type: startX + 100,
        qty: startX + 300,
        price: startX + 370,
        subtotal: startX + 460,
      };

      // Header tabel
      doc
        .fontSize(12)
        .fillColor(darkColor)
        .font("Helvetica-Bold");
      doc.text("Code", colPositions.code, startY);
      doc.text("Type", colPositions.type, startY);
      doc.text("Qty", colPositions.qty, startY, { width: 30, align: "right" });
      doc.text("Price", colPositions.price, startY, { width: 70, align: "right" });
      doc.text("Subtotal", colPositions.subtotal, startY, { width: 80, align: "right" });

      // Garis bawah header
      doc
        .moveTo(startX, startY + 15)
        .lineTo(startX + 520, startY + 15)
        .stroke();

      // Baris data tiket
      doc
        .fontSize(10)
        .fillColor("black")
        .font("Helvetica");

      let total = 0;
      tickets.forEach((item, index) => {
        const y = startY + lineHeight * (index + 1);

        // Pastikan data valid dan bukan NaN
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.ticket.price) || 0;
        const subtotal = quantity * price;
        total += subtotal;

        doc.text(item.ticket.code || "N/A", colPositions.code, y);
        doc.text(item.ticket.type || "N/A", colPositions.type, y);
        doc.text(quantity.toString(), colPositions.qty, y, { width: 30, align: "right" });
        doc.text(`Rp ${price.toLocaleString("id-ID")}`, colPositions.price, y, { width: 70, align: "right" });
        doc.text(`Rp ${subtotal.toLocaleString("id-ID")}`, colPositions.subtotal, y, { width: 80, align: "right" });
      });

      // Garis bawah tabel
      const tableBottomY = startY + lineHeight * (tickets.length + 1);
      doc.moveTo(startX, tableBottomY).lineTo(startX + 520, tableBottomY).stroke();

      // Total pembayaran
      doc.moveDown(2);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`Total: Rp ${total.toLocaleString("id-ID")}`, { align: "right" });

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor("gray")
        .text(
          "Harap tunjukkan tiket ini saat masuk ke Museum Lampung. Tiket hanya berlaku sesuai tanggal yang tertera.",
          { align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generateTicketPDF;
