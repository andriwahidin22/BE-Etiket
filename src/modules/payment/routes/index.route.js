// File: src/routes/payment/index.route.js

const express = require("express");
const router = express.Router();
<<<<<<< HEAD:src/routes/payment/index.route.js
const paymentController = require("../../controllers/payment/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");
=======
const paymentController = require('../controllers/index.controller');
const { verifyToken } = require('@/middleware/auth');
>>>>>>> a6733ec (Feat: Modular Struktur Folder):src/modules/payment/routes/index.route.js

// Initiate payment (protected)
router.post("/", verifyToken, paymentController.initiatePayment);

// Midtrans notification handler (public)
router.post("/notification", paymentController.handleNotification);

// Check payment status (protected)
router.get("/status/:orderId", verifyToken, paymentController.checkPaymentStatus);

router.post("/notification", 
  express.json({ type: 'application/json' }),
  paymentController.handleNotification
);

router.post("/", verifyToken, paymentController.initiatePayment);
router.get("/status/:orderId", verifyToken, paymentController.checkPaymentStatus);

module.exports = router;