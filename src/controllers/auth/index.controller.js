// file controllers/auth/index.controller.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET;

// Setup transporter email (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true jika port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Register user
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const now = new Date();

    // Generate kode verifikasi 6 digit
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    // Set expired 1 jam dari sekarang
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    if (existingUser) {
      if (existingUser.isVerified) {
        // Email sudah terdaftar dan diverifikasi
        return res.status(400).json({ msg: "Email sudah terdaftar" });
      } else {
        // Email sudah ada tapi belum diverifikasi
        // Cek apakah kode verifikasi masih berlaku
        if (existingUser.verificationCodeExpiresAt && existingUser.verificationCodeExpiresAt > now) {
          return res.status(400).json({ msg: "Silakan cek email Anda untuk verifikasi" });
        } else {
          // Kode expired, update data user dengan kode dan expired baru
          const hashedPassword = await bcrypt.hash(password, 10);

          await prisma.user.update({
            where: { email },
            data: {
              fullName,
              phoneNumber,
              password: hashedPassword,
              verificationCode,
              verificationCodeExpiresAt: expiresAt,
              updatedAt: now,
            },
          });

          // Kirim email verifikasi baru
          const mailOptions = {
            from: `"Museum Lampung" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Verifikasi Email Anda - Kode Baru",
            html: `
              <p>Halo ${fullName},</p>
              <p>Kode verifikasi lama sudah kadaluarsa. Berikut kode verifikasi baru Anda:</p>
              <h2>${verificationCode}</h2>
              <p>Masukkan kode ini untuk mengaktifkan akun Anda.</p>
            `,
          };

          await transporter.sendMail(mailOptions);

          return res.json({
            msg: "Kode verifikasi baru telah dikirim ke email Anda, silakan cek email.",
          });
        }
      }
    }

    // Jika user belum ada, buat user baru
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "BUYER",
        fullName,
        phoneNumber,
        isVerified: false,
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
      },
    });

    // Kirim email verifikasi
    const mailOptions = {
      from: `"Museum Lampung" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verifikasi Email Anda",
      html: `
        <p>Halo ${fullName},</p>
        <p>Terima kasih telah mendaftar. Berikut kode verifikasi Anda:</p>
        <h2>${verificationCode}</h2>
        <p>Masukkan kode ini untuk mengaktifkan akun Anda.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      msg: "Registrasi berhasil, silakan cek email untuk kode verifikasi",
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};


// Verifikasi kode email
exports.verifyEmail = async (req, res) => {
  try {
    let { userId, code } = req.body;

    userId = parseInt(userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ msg: "User ID tidak valid" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    if (user.isVerified)
      return res.status(400).json({ msg: "User sudah terverifikasi" });

    const now = new Date();

    if (!user.verificationCode || user.verificationCode !== code) {
      return res.status(400).json({ msg: "Kode verifikasi salah" });
    }

    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < now) {
      return res.status(400).json({ msg: "Kode verifikasi sudah kadaluarsa, silakan registrasi ulang" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });

    res.json({ msg: "Email berhasil diverifikasi, Anda bisa login sekarang" });
  } catch (err) {
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};

exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
    if (user.isVerified) return res.status(400).json({ msg: "Email sudah terverifikasi" });

    const now = new Date();
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
        updatedAt: now,
      },
    });

    // Kirim email kode verifikasi baru
    const mailOptions = {
      from: `"Museum Lampung" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Kode Verifikasi Baru",
      html: `<p>Kode verifikasi baru Anda: <b>${verificationCode}</b></p>`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ msg: "Kode verifikasi baru telah dikirim ke email Anda" });
  } catch (err) {
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};


// Login dengan pengecualian verifikasi untuk admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    if (user.role !== "ADMIN" && !user.isVerified)
      return res.status(403).json({ msg: "Email belum diverifikasi" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Password salah" });

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      },
      SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      status: "success",
      message: "Login berhasil",
      data: {
        token,
        role: user.role,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};

// Request reset password (kirim kode reset ke email)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    // Generate kode reset 6 digit
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const now = new Date();
    // Expired 1 jam dari sekarang
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    // Simpan kode reset dan expired ke user
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordCode: resetCode,
        resetPasswordExpiresAt: expiresAt,
        updatedAt: now,
      },
    });

    // Kirim email kode reset password
    const mailOptions = {
      from: `"Museum Lampung" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Password - Kode Verifikasi",
      html: `
        <p>Halo ${user.fullName},</p>
        <p>Anda meminta reset password. Berikut kode verifikasi untuk reset password Anda:</p>
        <h2>${resetCode}</h2>
        <p>Kode ini berlaku selama 1 jam.</p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ msg: "Kode reset password telah dikirim ke email Anda" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};

// Reset password dengan kode verifikasi
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    const now = new Date();

    if (!user.resetPasswordCode || user.resetPasswordCode !== code) {
      return res.status(400).json({ msg: "Kode reset password salah" });
    }

    if (!user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < now) {
      return res.status(400).json({ msg: "Kode reset password sudah kadaluarsa" });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan hapus kode reset
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpiresAt: null,
        updatedAt: now,
      },
    });

    res.json({ msg: "Password berhasil diubah, silakan login dengan password baru" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};

// Fungsi revoke Google token (opsional)
async function revokeGoogleToken(token) {
  try {
    await axios.post(
      `https://oauth2.googleapis.com/revoke?token=${token}`,
      {},
      { headers: { "Content-type": "application/x-www-form-urlencoded" } }
    );
    console.log("Google token revoked");
  } catch (error) {
    console.error("Failed to revoke Google token", error.response?.data || error.message);
  }
}

// Logout controller
exports.logout = async (req, res) => {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ msg: "Token tidak ditemukan" });
    }
    const token = authHeader.split(" ")[1];

    // Verifikasi token untuk dapatkan user info
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return res.status(401).json({ msg: "Token tidak valid atau sudah expired" });
    }

    // Jika Anda menyimpan Google access token di user, revoke token Google
    const userId = decoded.id;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleAccessToken) {
        await revokeGoogleToken(user.googleAccessToken);
        // Optional: hapus token Google di database
        await prisma.user.update({
          where: { id: userId },
          data: { googleAccessToken: null },
        });
      }
    }

    // Karena sistem stateless, backend tidak menyimpan token, jadi logout cukup di frontend hapus token
    // Di backend hanya menginformasikan logout berhasil
    res.json({ msg: "Logout berhasil, silakan hapus token di client" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Terjadi kesalahan server", error: err.message });
  }
};