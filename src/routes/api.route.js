const express = require("express");
const router = express.Router();

// Authentication Routes
router.use("/auth", require("./auth/index.route"));

// Ticket Routes
router.use("/ticket", require("./ticket/index.route"));

// Venue Routes
router.use("/venue", require("./venue/index.route"));

// Order Routes
router.use("/orders", require("./order/index.route"));

// Payment Routes
router.use("/payments", require("./payment/index.route"));

// Review Routes
router.use("/reviews", require("./review/index.route"));

// Admin Routes
router.use("/admin/dashboard", require("./admin/dashboardRoutes/index.route"));
router.use("/admin/verification", require("./admin/verificationRoutes/index.route"));

// Admin User Management Routes
const adminUserRoutes = require("./admin/userRoutes/index.route");
router.use("/admin/users", adminUserRoutes);

// User Routes (for profile editing etc.)
const userRoutes = require("./users/index.route");
router.use("/users", userRoutes);

// Gallery Routes — **TAMBAHKAN INI**
router.use("/gallery", require("./gallery/index.route"));

// Tambahkan ini:
router.use("/admin/reports", require("./admin/reportRoutes/index.route"));

module.exports = router;
