//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Endpoint untuk admin: get semua order
router.get("/", verifyToken, isAdmin, orderController.getAllOrders);

// Ambil detail order berdasarkan ID (bisa diakses user mana saja, sesuaikan validasi jika perlu)
router.get("/:id", verifyToken, orderController.getOrderById);

// Download tiket PDF berdasarkan order ID
router.get("/:id/download", verifyToken, orderController.downloadTicket);

// Kirim ulang tiket ke email yang ditentukan
router.post("/:id/resend-ticket", verifyToken, orderController.resendTicket);

// Endpoint baru untuk validasi kehadiran berdasarkan kode pemesanan
router.post("/validate-order", verifyToken, isAdmin, orderController.validateOrderByCode);

module.exports = router;
