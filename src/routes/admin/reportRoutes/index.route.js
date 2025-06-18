const express = require("express");
const router = express.Router();
const reportController = require("../../../controllers/admin/report/index.controller");
const { verifyToken, isAdmin } = require("../../../middleware/auth");

// POST /admin/reports/purchases
router.post("/", reportController.getPurchaseReport);

router.get("/purchase-report", reportController.getPurchaseReportView);

router.get("/pdf/download", verifyToken,isAdmin, reportController.getPurchaseReportDownload);
module.exports = router;