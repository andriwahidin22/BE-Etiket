// src/utils/generateReviewPDF.js

const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const generateReviewPDF = async (data, outputPath) => {
  try {
    const templatePath = path.join(__dirname, "../views/review-template.ejs");

    const html = await ejs.renderFile(templatePath, {
      reviews: data.reviews,
      averageRating: data.averageRating,
    });

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close(); // ✅ Ini harus ditutup
    return outputPath;
  } catch (error) {
    console.error("❌ Failed to generate review PDF:", error);
    throw error;
  }
};

module.exports = generateReviewPDF;
