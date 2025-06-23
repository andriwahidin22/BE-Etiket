// src/utils/generateTicketPDF.js

const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");

const typeColors = {
  TIP: "#FFD700",
  TID: "#1E90FF",
};

function getColorForType(type) {
  return typeColors[type] || "#CCCCCC";
}

const generateTicketPDF = async ({
  order,
  orderItems,
  ticketInstances,
  user,
  outputPath,
}) => {
  try {
    if (!Array.isArray(orderItems)) orderItems = [];
    if (!Array.isArray(ticketInstances)) ticketInstances = [];

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

    const templatePath = path.resolve(__dirname, "../views/ticket-template.ejs");
    const html = await ejs.renderFile(templatePath, {
      order,
      ticketsToRender,
      user,
    });

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      width: "143mm",
      height: "50mm",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });

    await browser.close();

    return outputPath;
  } catch (error) {
    console.error("❌ generateTicketPDF error:", error);
    throw error;
  }
};

module.exports = generateTicketPDF;
