//src/utils/generateInvoicePDF.js

const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");

async function generateInvoicePDF(order, user) {
  try {
    // Render invoice template jadi HTML
    const templatePath = path.resolve(__dirname, "../views/invoice-template.ejs");
    const html = await ejs.renderFile(templatePath, { order, user });

    // Launch puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF ke buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "50px", bottom: "50px", left: "50px", right: "50px" },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    throw error;
  }
}

module.exports = generateInvoicePDF;
