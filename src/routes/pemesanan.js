const express = require("express");
const router = express.Router();
const { createPemesanan, getPemesanan } = require("../controllers/pemesananController");

// POST /api/pemesanan - Create Pemesanan
router.post("/", createPemesanan);

// GET /api/pemesanan - Get all Pemesanan
router.get("/", getPemesanan);

module.exports = router;
