const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/admin/dashboardController");
const { verifyToken, isAdmin } = require("../../middleware/auth");

//dashboard
router.get("/", verifyToken, isAdmin, dashboardController.getDashboard);

router.get("/pemesanan", verifyToken, isAdmin, dashboardController.getPemesananDetails);

module.exports = router;
