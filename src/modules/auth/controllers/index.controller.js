//file controllers/auth/index.controller.js

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
      { expiresIn: "1d" }
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