//src/utils/generateInvoicePDF.js

const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");

async function generateInvoicePDF(order, user) {
  try {
    const templatePath = path.resolve(__dirname, "../views/invoice-template.ejs");
    const html = await ejs.renderFile(templatePath, { order, user });

    const browser = await puppeteer.launch({
      executablePath: path.resolve(__dirname, "../chromium/chrome-linux/chrome"), // ✅ pastikan path ini valid
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "50px", bottom: "50px", left: "50px", right: "50px" },
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("❌ Gagal generate invoice PDF:", error);
    throw error;
  }
}

module.exports = generateInvoicePDF;
