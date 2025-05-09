const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail email
    pass: process.env.EMAIL_PASS  // Gmail app password
  }
});

async function sendTicketEmail(to, pdfBuffer, orderCode) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `Museum Ticket - ${orderCode}`,
    text: "Berikut tiket Anda. Harap tunjukkan saat kunjungan.",
    attachments: [
      {
        filename: `ticket-${orderCode}.pdf`,
        content: pdfBuffer
      }
    ]
  });
}

module.exports = sendTicketEmail;
