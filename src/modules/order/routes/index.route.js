//file routes/order.js

const express = require("express");
const router = express.Router();
<<<<<<< HEAD:src/routes/order/index.route.js
const orderController = require("../../controllers/order/index.controller");
const { verifyToken } = require("../../middleware/auth");
=======
const orderController = require('../controllers/index.controller');
const { verifyToken, isAdmin } = require('@/middleware/auth');
>>>>>>> a6733ec (Feat: Modular Struktur Folder):src/modules/order/routes/index.route.js

// For GET and POST orders, user must be logged in
router.get("/", verifyToken, orderController.getOrders);
router.get("/:id", verifyToken, orderController.getOrderById);
router.post("/", verifyToken, orderController.createOrder);

module.exports = router;
