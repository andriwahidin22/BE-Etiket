const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/admin/dashboardController");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Dashboard routes
router.get("/", verifyToken, isAdmin, dashboardController.getDashboard);
router.get("/orders", verifyToken, isAdmin, dashboardController.getOrderDetails);

module.exports = router;