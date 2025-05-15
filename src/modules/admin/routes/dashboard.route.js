const express = require("express");
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, isAdmin } = require('@/middleware/auth');

// Dashboard routes
router.get("/", verifyToken, isAdmin, dashboardController.getDashboard);
router.get("/orders", verifyToken, isAdmin, dashboardController.getOrderDetails);

module.exports = router;