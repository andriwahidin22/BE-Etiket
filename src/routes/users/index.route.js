const express = require("express");
const { updateProfile } = require("../../controllers/users/index.controller");
const { verifyToken } = require("../../middleware/auth");

const router = express.Router();


// Route untuk update profile
router.put("/profile", verifyToken, updateProfile);

module.exports = router;
