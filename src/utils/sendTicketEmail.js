const nodemailer = require("nodemailer");

async function sendTicketEmail(toEmail, order, pdfBuffer) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Museum Lampung" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `E-Ticket Order ${order.orderCode}`,
      html: `
        <p>Halo ${order.visitorName},</p>
        <p>Terima kasih telah memesan tiket di Museum Lampung.</p>
        <p>Berikut terlampir e-ticket Anda untuk kunjungan tanggal ${new Date(order.visitDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.</p>
        <p>Silakan tunjukkan e-ticket ini saat memasuki museum.</p>
        <p>Salam,<br/>Museum Lampung</p>
      `,
      attachments: [
        {
          filename: `${order.orderCode}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
    throw error;
  }
}

module.exports = sendTicketEmail;
