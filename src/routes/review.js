//file routes/review.js

const express = require("express");
const router = express.Router();
const { upsertReview } = require("../controllers/reviewController");
const { verifyToken } = require("../middleware/auth");

router.post("/", verifyToken, upsertReview);

module.exports = router;