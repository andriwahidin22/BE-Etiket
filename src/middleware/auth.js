const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

// Middleware untuk verifikasi token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ msg: "Token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Token tidak valid", error: err.message });
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
