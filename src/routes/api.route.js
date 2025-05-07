// File: src/routes/api.route.js
const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth/index.route"));
router.use("/ticket", require("./ticket/index.route"));
router.use("/venue", require("./venue/index.route"));
router.use("/orders", require("./order/index.route"));
router.use("/payments", require("./payment/index.route"));
router.use("/reviews", require("./review/index.route"));

// Admin
router.use("/admin/dashboard", require("./admin/dashboardRoutes/index.route"));
router.use("/admin/verification", require("./admin/verificationRoutes/index.route"));

//notifi
router.use("/payments/notification", require("./payment/notification.route"));

module.exports = router;