const express = require("express");
const router = express.Router();
const reportController = require("../../../controllers/admin/report/index.controller");

// POST /admin/reports/purchases
router.post("/", reportController.getPurchaseReport);

module.exports = router;