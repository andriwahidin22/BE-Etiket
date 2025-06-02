// File: src/routes/payment/index.route.js

const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/payment/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Initiate payment (protected)
router.post("/", verifyToken, paymentController.initiatePayment);

// Midtrans notification handler (public)
router.post("/notification", paymentController.handleNotification);

// Check payment status (protected)
router.get("/status/:orderId", verifyToken, paymentController.checkPaymentStatus);

// Get all payments (admin only)
router.get("/", verifyToken, isAdmin, paymentController.getAllPayments);

// get payments untuk user
router.get("/my-payments", verifyToken, paymentController.getUserPayments);

router.post("/notification", 
  express.json({ type: 'application/json' }),
  paymentController.handleNotification
);

router.get("/status/:orderId", verifyToken, paymentController.checkPaymentStatus);

module.exports = router;