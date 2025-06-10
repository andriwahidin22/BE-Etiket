//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Public route
router.post("/public/validate-attendance", orderController.validateAttendanceByQRCode);

// Admin routes
router.post("/validate-order", verifyToken, isAdmin, orderController.validateOrderByCode);
router.post("/validate-attendance", verifyToken, isAdmin, orderController.validateAttendanceByQRCode);
router.get("/ticket-instances", verifyToken, isAdmin, orderController.getAllTicketInstances);

// Authenticated user routes
router.get("/ticket-instances/:id", verifyToken, orderController.getTicketInstanceById);
router.get('/ticket-instances', verifyToken, isAdmin, orderController.getAllTicketInstances);


// Other routes
router.get("/", verifyToken, isAdmin, orderController.getAllOrders);
router.get("/:id/download", verifyToken, orderController.downloadTicket);
router.post("/:id/resend-ticket", verifyToken, orderController.resendTicket);
router.get("/:id", verifyToken, orderController.getOrderById);

module.exports = router;
