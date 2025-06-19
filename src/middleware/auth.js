// src/middleware/auth.js

const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]; // Untuk ambil dari Authorization Header
  } else if (req.query.token) {
    token = req.query.token; // Untuk ambil dari query param
  }

  if (!token) {
    return res.status(403).json({
      status: "error",
      message: "Token tidak ditemukan di header atau query parameter",
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(498).json({
        status: "error",
        message: "Token telah kedaluwarsa",
        error: err.message,
      });
    }

    return res.status(401).json({
      status: "error",
      message: "Token tidak valid",
      error: err.message,
    });
  }
};

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
