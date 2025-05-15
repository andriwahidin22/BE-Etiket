const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const Handlebars = require("handlebars");

async function generateTicketPDF(order, tickets) {
  // Load template HTML
  const templatePath = path.join(__dirname, "../../views/ticket-template.html");
  const templateHtml = fs.readFileSync(templatePath, "utf8");

  // Compile template dengan Handlebars
  const template = Handlebars.compile(templateHtml);

  // Format tanggal kunjungan ke format Indonesia, misal: 15 Mei 2025
  const visitDateFormatted = new Date(order.visitDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Hitung subtotal tiap tiket dan total harga
  let totalPrice = 0;
  const ticketsWithSubtotal = tickets.map((t) => {
    const subtotal = t.price * t.quantity;
    totalPrice += subtotal;
    return {
      ...t,
      subtotal: subtotal.toLocaleString("id-ID"),
      price: t.price.toLocaleString("id-ID"),
    };
  });

  // Data untuk template
  const data = {
    orderCode: order.orderCode,
    visitorName: order.visitorName,
    visitDate: visitDateFormatted,
    tickets: ticketsWithSubtotal,
    totalPrice: totalPrice.toLocaleString("id-ID"),
  };

  // Render HTML dengan data
  const html = template(data);

  // Launch Puppeteer dan generate PDF
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set konten HTML
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Generate PDF buffer
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
  });

  await browser.close();

  return pdfBuffer;
}

module.exports = generateTicketPDF;
