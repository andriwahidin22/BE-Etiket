const express = require("express");
const { updateProfile, getProfile } = require("../../controllers/users/index.controller");
const { verifyToken } = require("../../middleware/auth");

const router = express.Router();


// Route untuk update profile
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

module.exports = router;
