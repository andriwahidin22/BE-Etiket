const express = require("express");
const router = express.Router();

// ✅ Import controller
const pembayaranController = require("../controllers/pembayaranController");

// ✅ Import middleware
const { verifyToken, isAdmin } = require("../middleware/auth");

// ✅ Destructuring controller functions
const {
  getPembayaran,
  getPembayaranById,
  createPembayaran
} = pembayaranController;

// ✅ Routes
// GET semua pembayaran - hanya bisa diakses oleh user yang login
router.get("/", verifyToken, getPembayaran);

// GET pembayaran berdasarkan ID
router.get("/:id", verifyToken, getPembayaranById);

// POST untuk membuat pembayaran
router.post("/", verifyToken, createPembayaran);

module.exports = router;
