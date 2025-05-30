//src/utils/generateTicketPDF.js

const ejs = require("ejs");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const typeColors = {
  TIP: "#FFD700",
  TID: "#1E90FF",
};

function getColorForType(type) {
  return typeColors[type] || "#CCCCCC";
}

const generateTicketPDF = async (order, orderItems, ticketInstances, user, outputPath) => {
  try {
    // Buat array ticketsToRender gabungkan orderItems dengan ticketInstances
    let ticketsToRender = [];

    for (const orderItem of orderItems) {
      const instances = ticketInstances.filter(
        (ti) => ti.orderItemId === orderItem.id
      );

      for (const instance of instances) {
        ticketsToRender.push({
          qrCode: instance.qrCode,
          ticketCode: orderItem.ticket.code,
          ticketType: orderItem.ticket.type,
          ticketPrice: orderItem.ticketPrice,
          color: getColorForType(orderItem.ticket.type),
        });
      }
    }

    // Generate QR code untuk orderCode (bisa juga generate per tiket kalau perlu)
    // Tapi kita pakai QR per tiketInstance, jadi QR tiap tiketInstance sudah unik dan di HTML
    // Jadi tidak perlu buat QR code di sini

    // Render template EJS jadi HTML, kirim ticketsToRender array
    const templatePath = path.resolve(__dirname, "../views/ticket-template.ejs");
    const html = await ejs.renderFile(templatePath, {
      order,
      ticketsToRender,
      user,
    });

    // Launch puppeteer dan convert HTML ke PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A5",
      landscape: true,
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    return outputPath;
  } catch (error) {
    throw error;
  }
};

module.exports = generateTicketPDF;
