//src/utils/generateReportPDF.js

const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const generateReportPDF = async ({
  summary,
  totalAll,
  periodLabel,
  orders,
}) => {
  const templatePath = path.join(__dirname, "../views/report-template.ejs");
  const html = await ejs.renderFile(templatePath, {
    summary,
    totalAll,
    periodLabel,
    orders,
  });

  const reportsDir = path.join(__dirname, "../../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  const timestamp = Date.now();
  const fileName = `LAPORAN-${timestamp}_report.pdf`;
  const outputPath = path.join(reportsDir, fileName);

  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: outputPath, format: "A4" });
  await browser.close();

  return fileName;
};

module.exports = generateReportPDF;
