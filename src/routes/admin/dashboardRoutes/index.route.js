const express = require("express");
const router = express.Router();
const dashboardController = require("../../../controllers/admin/dashboard/index.controller");
const { verifyToken, isAdmin } = require("../../../middleware/auth");

// Main dashboard statistics
router.get('/stats', verifyToken, isAdmin, dashboardController.getDashboardStats);

// Recent orders widget
router.get('/recent-orders', verifyToken, isAdmin, dashboardController.getRecentOrders);

// Visitor statistics
router.get('/visitor-stats', verifyToken, isAdmin, dashboardController.getVisitorStats);

// Revenue statistics
router.get('/revenue-stats', verifyToken, isAdmin, dashboardController.getRevenueStats);

module.exports = router;