//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken } = require("../../middleware/auth");

// Ambil detail order berdasarkan ID (bisa diakses user mana saja, sesuaikan validasi jika perlu)
router.get("/:id", verifyToken, orderController.getOrderById);

// Download tiket PDF berdasarkan order ID
router.get("/:id/download-ticket", verifyToken, orderController.downloadTicket);

// Kirim ulang tiket ke email yang ditentukan
router.post("/:id/resend-ticket", verifyToken, orderController.resendTicket);

// NOTE: Endpoint POST /orders untuk membuat order baru dihapus atau dinonaktifkan
// Jika ingin tetap ada, pastikan hanya dipakai untuk membuat order baru, bukan untuk resend/download tiket

module.exports = router;
