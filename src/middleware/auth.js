//src/middleware/auth.js

const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({
      status: "error",
      message: "Token tidak ditemukan atau format salah",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak valid",
      error: err.message,
    });
  }
};

// Middleware untuk memastikan hanya admin yang bisa lanjut
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      status: "error",
      message: "Akses hanya untuk admin",
    });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
