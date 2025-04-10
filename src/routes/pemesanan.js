const express = require("express");
const router = express.Router();
const pemesananController = require("../controllers/pemesananController");
const { verifyToken } = require("../middleware/auth");

// Untuk GET dan POST pemesanan, user harus login (baik pembeli maupun admin tergantung fitur)
router.get("/", verifyToken, pemesananController.getPemesanan);
router.get("/:id", verifyToken, pemesananController.getPemesananById);
router.post("/", verifyToken, pemesananController.createPemesanan);

module.exports = router;
