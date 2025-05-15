// File: src/routes/api.route.js
const express = require("express");
const router = express.Router();

<<<<<<< HEAD
router.use("/index", require("./index/index.route"));
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
=======
// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
const r0 = require("../modules/admin/routes/dashboard.route.js");
const r1 = require("../modules/admin/routes/users.route.js");
const r2 = require("../modules/admin/routes/verification.route.js");
const r3 = require("../modules/auth/routes/index.route.js");
const r4 = require("../modules/order/routes/index.route.js");
const r5 = require("../modules/payment/routes/index.route.js");
const r6 = require("../modules/review/routes/index.route.js");
const r7 = require("../modules/ticket/routes/index.route.js");
const r8 = require("../modules/users/routes/index.route.js");
const r9 = require("../modules/venue/routes/index.route.js");

router.use("/admin/dashboard", r0);
router.use("/admin/users", r1);
router.use("/admin/verification", r2);
router.use("/auth", r3);
router.use("/order", r4);
router.use("/payment", r5);
router.use("/review", r6);
router.use("/ticket", r7);
router.use("/users", r8);
router.use("/venue", r9);
>>>>>>> a6733ec (Feat: Modular Struktur Folder)

module.exports = router;
