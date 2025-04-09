const express = require("express");
const router = express.Router();
const { createPembayaran, getPembayaran } = require("../controllers/pembayaranController");

// POST /api/pembayaran - Create Pembayaran
router.post("/", createPembayaran);

// GET /api/pembayaran - Get all Pembayaran
router.get("/", getPembayaran);

module.exports = router;
