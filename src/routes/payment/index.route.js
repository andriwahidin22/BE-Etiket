//file routes/payment.js

const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/payment/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

const {
  getPayments,
  getPaymentById,
  createPayment
} = paymentController;

// Routes
// GET all payments - only accessible by logged in users
router.get("/", verifyToken, getPayments);

// GET payment by ID
router.get("/:id", verifyToken, getPaymentById);

// POST to create payment
router.post("/", verifyToken, createPayment);

module.exports = router;