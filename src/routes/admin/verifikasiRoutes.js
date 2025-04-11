// routes/admin/verifikasiRoutes.js
const express = require("express");
const router = express.Router();
const { verifikasiTiket } = require("../../controllers/admin/verifikasiController");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Endpoint hanya bisa diakses admin
router.post("/", verifyToken, isAdmin, verifikasiTiket);

module.exports = router;
