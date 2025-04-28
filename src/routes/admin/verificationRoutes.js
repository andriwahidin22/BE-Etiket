const express = require("express");
const router = express.Router();
const { verifyTicket } = require("../../controllers/admin/verificationController");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Admin-only endpoint for ticket verification
router.post("/", verifyToken, isAdmin, verifyTicket);

module.exports = router;