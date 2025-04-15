const express = require("express");
const router = express.Router();
const { upsertRating } = require("../controllers/ratingController");
const { verifyToken } = require("../middleware/auth");

router.post("/", verifyToken, upsertRating);

module.exports = router;
