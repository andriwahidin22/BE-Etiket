const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");

/**
 * Generate PDF tiket dengan QR code unik tiap tiket berdasarkan quantity dan kategori tiket
 * @param {Object} order - Data order
 * @param {Array} orderItems - Daftar order item dengan detail tiket dan quantity
 * @param {Object} user - Data pengguna
 * @param {string} outputPath - Path untuk menyimpan PDF
 * @returns {Promise}
 */
const generateTicketPDF = async (order, orderItems, user, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Gunakan ukuran A5 landscape (595 x 420 poin)
      const doc = new PDFDocument({
        size: "A5",
        layout: "landscape",
        margin: 20,
      });

      const writeStream = fs.createWriteStream(outputPath);
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(outputPath));
      doc.pipe(writeStream);

      const primaryColor = "#FFB81C";
      const darkColor = "#003366";
      const grayColor = "#666666";

      // Halaman pertama: Ringkasan pesanan dengan tabel
      doc
        .rect(10, 10, doc.page.width - 20, doc.page.height - 20)
        .fill("#ffffff")
        .strokeColor(primaryColor)
        .lineWidth(3)
        .roundedRect(10, 10, doc.page.width - 20, doc.page.height - 20, 15)
        .stroke();

      // Judul tiket di kiri atas
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("E-Ticket Museum Lampung", 30, 30, { width: 350 });

      // Generate QR code untuk orderCode di kanan atas
      const qrDataUrlOrder = await QRCode.toDataURL(order.orderCode);
      const qrSize = 120;
      doc.image(qrDataUrlOrder, doc.page.width - qrSize - 30, 30, {
        width: qrSize,
        height: qrSize,
      });

      // Garis vertikal pemisah dekat QR code
      doc
        .moveTo(doc.page.width - qrSize - 40, 30)
        .lineTo(doc.page.width - qrSize - 40, 30 + qrSize)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

      // Informasi order di kiri bawah QR code
      const infoX = 30;
      let infoY = 70;
      const lineGap = 20;
      doc
        .fillColor(darkColor)
        .fontSize(12)
        .font("Helvetica")
        .text(`Order Code: ${order.orderCode}`, infoX, infoY);
      infoY += lineGap;
      doc.text(`Visitor: ${order.visitorName}`, infoX, infoY);
      infoY += lineGap;
      doc.text(
        `Visit Date: ${new Date(order.visitDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        infoX,
        infoY
      );
      infoY += lineGap;
      doc.text(`Email: ${user.email}`, infoX, infoY);

      // Garis horizontal di bawah info
      const lineY = infoY + 25;
      doc
        .moveTo(20, lineY)
        .lineTo(doc.page.width - 20, lineY)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

      // Header tabel detail tiket
      const tableStartY = lineY + 15;
      const colX = [30, 130, 230, 310, 390];
      const colHeaders = ["Code", "Type", "Qty", "Price", "Subtotal"];

      doc
        .fontSize(11)
        .fillColor(primaryColor)
        .font("Helvetica-Bold");
      colHeaders.forEach((header, i) => {
        doc.text(header, colX[i], tableStartY);
      });

      // Isi tabel tiket
      doc.font("Helvetica").fillColor(darkColor).fontSize(11);
      let total = 0;
      orderItems.forEach((item, idx) => {
        const y = tableStartY + 25 + idx * 22;
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.ticketPrice) || 0;
        const subtotal = quantity * price;
        total += subtotal;

        doc.text(item.ticket?.code || "N/A", colX[0], y);
        doc.text(item.ticket?.type || "N/A", colX[1], y);
        doc.text(quantity.toString(), colX[2], y, { width: 30, align: "right" });
        doc.text(price.toLocaleString("id-ID"), colX[3], y, { width: 70, align: "right" });
        doc.text(subtotal.toLocaleString("id-ID"), colX[4], y, { width: 80, align: "right" });
      });

      // Total harga di bawah tabel, rata kanan
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(primaryColor)
        .text(`Total: Rp ${total.toLocaleString("id-ID")}`, colX[4], tableStartY + 25 + orderItems.length * 22 + 15, {
          width: 80,
          align: "right",
        });

      // Catatan footer di bawah total
      doc
        .fontSize(9)
        .fillColor(grayColor)
        .font("Helvetica-Oblique")
        .text(
          "Harap tunjukkan tiket ini saat masuk ke Museum Lampung. Tiket hanya berlaku sesuai tanggal yang tertera.",
          20,
          doc.page.height - 40,
          { width: doc.page.width - 40, align: "center" }
        );

      // Akhiri halaman ringkasan dan mulai halaman tiket per unit
      doc.addPage();

      // Halaman berikutnya: Buat halaman tiket per unit berdasarkan quantity dan kategori tiket
      for (const item of orderItems) {
        const quantity = Number(item.quantity) || 0;
        for (let i = 0; i < quantity; i++) {
          // Background putih dengan border rounded
          doc
            .rect(10, 10, doc.page.width - 20, doc.page.height - 20)
            .fill("#ffffff")
            .strokeColor(primaryColor)
            .lineWidth(3)
            .roundedRect(10, 10, doc.page.width - 20, doc.page.height - 20, 15)
            .stroke();

          // Judul tiket di kiri atas
          doc
            .fillColor(primaryColor)
            .fontSize(20)
            .font("Helvetica-Bold")
            .text("E-Ticket Museum Lampung", 30, 30, { width: 350 });

          // Buat QR code unik per tiket: TICKET-<orderCode>-<ticketCode>-<noUrut>
          const qrCodeString = `TICKET-${order.orderCode}-${item.ticket?.code || "NOCODE"}-${i + 1}`;
          const qrDataUrl = await QRCode.toDataURL(qrCodeString);
          const qrSize = 120;
          doc.image(qrDataUrl, doc.page.width - qrSize - 30, 30, {
            width: qrSize,
            height: qrSize,
          });

          // Garis vertikal pemisah dekat QR code
          doc
            .moveTo(doc.page.width - qrSize - 40, 30)
            .lineTo(doc.page.width - qrSize - 40, 30 + qrSize)
            .lineWidth(1)
            .strokeColor(primaryColor)
            .stroke();

          // Informasi tiket di kiri bawah QR code
          let infoY = 70;
          doc
            .fillColor(darkColor)
            .fontSize(12)
            .font("Helvetica")
            .text(`Visitor: ${order.visitorName}`, 30, infoY);
          infoY += 20;
          doc.text(
            `Visit Date: ${new Date(order.visitDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`,
            30,
            infoY
          );
          infoY += 20;
          doc.text(`Ticket Code: ${item.ticket?.code || "N/A"}`, 30, infoY);
          infoY += 20;
          doc.text(`Ticket Category: ${item.ticket?.type || "N/A"}`, 30, infoY);

          // Garis horizontal di bawah info
          const lineY = infoY + 25;
          doc
            .moveTo(20, lineY)
            .lineTo(doc.page.width - 20, lineY)
            .lineWidth(1)
            .strokeColor(primaryColor)
            .stroke();

          // Catatan footer di bawah garis
          doc
            .fontSize(9)
            .fillColor(grayColor)
            .font("Helvetica-Oblique")
            .text(
              "Harap tunjukkan tiket ini saat masuk ke Museum Lampung. Tiket hanya berlaku sesuai tanggal yang tertera.",
              20,
              doc.page.height - 40,
              { width: doc.page.width - 40, align: "center" }
            );

          // Jika bukan tiket terakhir, tambahkan halaman baru
          if (!(item === orderItems[orderItems.length - 1] && i === quantity - 1)) {
            doc.addPage();
          }
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateTicketPDF;
