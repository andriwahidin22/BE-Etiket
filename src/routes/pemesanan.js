const express = require("express");
const router = express.Router();
const { createPemesanan, getPemesanan, getPemesananById } = require("../controllers/pemesananController");

// POST /api/pemesanan - Create Pemesanan
router.post("/", createPemesanan);

// GET /api/pemesanan - Get all Pemesanan
router.get("/", getPemesanan);

//GET /api/pemesanan/:id - Get Pemesanan by id
router.get("/:id", getPemesananById);

module.exports = router;
