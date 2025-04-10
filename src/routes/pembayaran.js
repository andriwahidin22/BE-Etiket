const express = require("express");
const router = express.Router();
const { createPembayaran, getPembayaran, getPembayaranById } = require("../controllers/pembayaranController");

// POST /api/pembayaran - Create Pembayaran
router.post("/", createPembayaran);

// GET /api/pembayaran - Get all Pembayaran
router.get("/", getPembayaran);

//GET /api/pembayaran/:id - Get Pembayaran by id
router.get("/:id", getPembayaranById);

module.exports = router;
