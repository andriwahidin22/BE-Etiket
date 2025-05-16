const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");

/**
 * Generate tiket PDF dengan desain panjang (landscape) mirip tiket pesawat
 * @param {Object} order - Data order (orderCode, visitorName, visitDate)
 * @param {Array} orderItems - Array tiket dengan detail { ticket: { code, type }, quantity, ticketPrice }
 * @param {Object} user - Data user (email)
 * @param {string} outputPath - Path untuk menyimpan file PDF
 * @returns {Promise<string>} - Path file PDF yang sudah dibuat
 */
const generatePDF = async (order, orderItems, user, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Buat dokumen PDF dengan ukuran tiket panjang dan layout landscape
      const doc = new PDFDocument({
        size: [350, 150],
        layout: "landscape",
        margin: 15,
      });

      const writeStream = fs.createWriteStream(outputPath);
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(outputPath));
      doc.pipe(writeStream);

      // Warna tema
      const primaryColor = "#FFB81C"; // kuning emas
      const darkColor = "#003366"; // biru tua
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

      // Generate QR Code dari orderCode dan tampilkan di kanan atas
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
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generatePDF;
