const ejs = require("ejs");
const path = require("path");
const pdf = require("html-pdf");
const fs = require("fs");

const generateReviewPDF = async (data, outputPath) => {
  const templatePath = path.join(__dirname, "../views/review-template.ejs");

  return new Promise((resolve, reject) => {
    ejs.renderFile(
      templatePath,
      { reviews: data.reviews, averageRating: data.averageRating },
      (err, html) => {
        if (err) {
          return reject(err);
        }

        const options = {
          format: "A4",
          orientation: "portrait",
          border: "10mm",
        };

        pdf.create(html, options).toFile(outputPath, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      }
    );
  });
};

module.exports = generateReviewPDF;
