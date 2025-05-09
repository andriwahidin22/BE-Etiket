//src/utils/mailer.js

const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const generateTicketPDF = require("./pdfGenerator"); // Import pdf generator

dotenv.config();

const sendTicketEmail = async (recipientEmail, order, user, tickets) => {
  try {
    // Baca file template HTML
    const htmlTemplate = fs.readFileSync(
      path.join(__dirname, "..", "views", "ticket-template.html"),
      "utf-8"
    );

    // Gantikan placeholder dengan data dinamis
    const filledHtml = htmlTemplate
      .replace("{{orderCode}}", order.orderCode)
      .replace("{{visitorName}}", order.visitorName)
      .replace("{{visitDate}}", new Date(order.visitDate).toLocaleDateString())
      .replace("{{email}}", user.email);

    // Generate PDF dari data tiket
    const pdfBuffer = await generateTicketPDF(order, user, tickets);

    // Create reusable transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: "gmail", // Gunakan Gmail
      auth: {
        user: process.env.EMAIL_USER, // Email pengirim
        pass: process.env.EMAIL_PASS, // App password dari Gmail
      },
    });

    // Setup email data dengan HTML
    const mailOptions = {
      from: process.env.EMAIL_USER, // Email pengirim
      to: recipientEmail, // Email penerima (user yang membuat order)
      subject: `Your Ticket Order #${order.orderCode}`, // Subjek email
      html: filledHtml, // Isi email menggunakan HTML template
      attachments: [
        {
          filename: `ticket-${order.orderCode}.pdf`,
          content: pdfBuffer, // Lampiran PDF tiket
        },
      ],
    };

    // Kirim email dengan template HTML dan lampiran PDF
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

module.exports = sendTicketEmail;
