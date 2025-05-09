//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/index.controller");
const { verifyToken } = require("../../middleware/auth");

// For GET and POST orders, user must be logged in
router.get("/", verifyToken, orderController.getOrders); // Mendapatkan semua order
router.get("/:id", verifyToken, orderController.getOrderById); // Mendapatkan order berdasarkan ID
router.post("/", verifyToken, orderController.createOrder); // Membuat order baru dan mengirimkan tiket melalui email

module.exports = router;

