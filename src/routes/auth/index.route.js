const express = require("express");
const router = express.Router();
const passport = require("../../config/passport");
const { register, login, verifyEmail, resendVerificationCode, forgotPassword, resetPassword } = require("../../controllers/auth/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Register user baru dengan verifikasi email
router.post("/register", register);

// Verifikasi kode email
router.post("/verify-email", verifyEmail);

// Verifikasi ulang (kirim ulang kode verifikasi)
router.post("/resend-verification", resendVerificationCode);

// Login biasa
router.post("/login", login);

// Route request reset password (kirim kode)
router.post("/forgot-password", forgotPassword);

// Route reset password dengan kode verifikasi
router.post("/reset-password", resetPassword);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const user = req.user;
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Redirect ke frontend callback dengan token sebagai query parameter
    const frontendCallbackUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/google/callback?token=${token}`;
    res.redirect(frontendCallbackUrl);
  }
);


module.exports = router;
