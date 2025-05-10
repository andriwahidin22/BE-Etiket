// File: src/routes/admin/userRoutes/index.route.js
const express = require("express");
const { getAllBuyers } = require("../../../controllers/admin/users/index.controller");
const { verifyToken, isAdmin } = require("../../../middleware/auth");

const router = express.Router();

// Pastikan ada handler yang sesuai di sini untuk route GET
router.get("/buyers", verifyToken, isAdmin, getAllBuyers);

module.exports = router;
