const express = require("express");
const router = express.Router();

const passport = require("@/config/passport");
const {
  register,
  login,
  verifyEmail,
  resendVerificationCode,
} = require("../controllers/index.controller");
const { verifyToken, isAdmin } = require("@/middleware/auth");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
