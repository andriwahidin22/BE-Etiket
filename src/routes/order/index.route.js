//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// ⛳ Spesifik routes (taruh paling atas)
router.post("/validate-order", verifyToken, isAdmin, orderController.validateOrderByCode);
router.post("/validate-attendance", verifyToken, isAdmin, orderController.validateAttendanceByQRCode);

// ✅ Umum
router.get("/", verifyToken, isAdmin, orderController.getAllOrders);
router.get("/:id/download", verifyToken, orderController.downloadTicket);
router.post("/:id/resend-ticket", verifyToken, orderController.resendTicket);

// ⛔ Dynamic params harus paling bawah
router.get("/:id", verifyToken, orderController.getOrderById);

module.exports = router;
