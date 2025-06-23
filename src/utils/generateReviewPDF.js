//src/utils/generateReviewPDF.js

const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const fs = require("fs");

const generateReviewPDF = async (data, outputPath) => {
  try {
    const templatePath = path.join(__dirname, "../views/review-template.ejs");

    // Render EJS to HTML
    const html = await ejs.renderFile(templatePath, {
      reviews: data.reviews,
      averageRating: data.averageRating,
    });

    const browser = await puppeteer.launch({
      executablePath: path.resolve(__dirname, "../chromium/chrome-linux/chrome"), // ✅ sesuaikan path
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();
    return outputPath;
  } catch (error) {
    console.error("❌ Failed to generate review PDF:", error);
    throw error;
  }
};

module.exports = generateReviewPDF;
