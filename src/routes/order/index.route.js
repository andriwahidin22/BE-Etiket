const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// ✅ Public route (tidak butuh login)
router.post("/public/validate-attendance", orderController.validateAttendanceByQRCode);

// ✅ Admin-only routes
router.post("/validate-order", verifyToken, isAdmin, orderController.validateOrderByCode);
router.post("/validate-attendance", verifyToken, isAdmin, orderController.validateAttendanceByQRCode);
router.get("/ticket-instances", verifyToken, isAdmin, orderController.getAllTicketInstances);

// ✅ Authenticated user routes (semua yang login)
router.get("/", verifyToken, orderController.getAllOrders); // Admin: semua, User: milik sendiri
router.get("/ticket-instances/:id", verifyToken, orderController.getTicketInstanceById);
router.get("/:id", verifyToken, orderController.getOrderById);
router.get("/:id/download", verifyToken, orderController.downloadTicket);
router.post("/:id/resend-ticket", verifyToken, orderController.resendTicket);

module.exports = router;
