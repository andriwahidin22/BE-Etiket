//file routes/order.js

const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/auth");

// For GET and POST orders, user must be logged in
router.get("/", verifyToken, orderController.getOrders);
router.get("/:id", verifyToken, orderController.getOrderById);
router.post("/", verifyToken, orderController.createOrder);

module.exports = router;
