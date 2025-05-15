// routes/review.js
const express = require("express");
const router = express.Router();
const { 
  getAllReviews,
  upsertReview,
  updateReview,
  deleteReview
} = require('../controllers/index.controller');
const { verifyToken } = require('@/middleware/auth');

// GET semua ulasan (akses publik)
router.get("/", getAllReviews);

// POST/PUT ulasan (upsert) - perlu autentikasi
router.post("/create", verifyToken, upsertReview);

// PUT ulasan spesifik (perlu autentikasi)
router.put("/update/:id", verifyToken, updateReview);

// DELETE ulasan (perlu autentikasi)
router.delete("/:id", verifyToken, deleteReview);

module.exports = router;