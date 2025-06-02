//src/middleware/auth.js

const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

// Middleware untuk verifikasi token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Cek apakah Authorization header tersedia dan format benar
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ status: "error", message: "Token tidak ditemukan atau format salah" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Tambahkan data user ke request untuk digunakan di controller
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: "error", message: "Token tidak valid", error: err.message });
  }
};

// Middleware untuk verifikasi role admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ msg: "Akses hanya untuk admin" });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
