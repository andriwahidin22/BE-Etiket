//file src/routes/auth/index.route.js


const express = require("express");
const router = express.Router();
const passport = require("../../config/passport");
const authController = require("../../controllers/auth/index.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth");

// Register user baru dengan verifikasi email
router.post("/register", authController.register);

// Verifikasi kode email
router.post("/verify-email", authController.verifyEmail);

// Verifikasi ulang (kirim ulang kode verifikasi)
router.post("/resend-verification", authController.resendVerificationCode);

// Login biasa
router.post("/login", authController.login);

// Route request reset password (kirim kode)
router.post("/forgot-password", authController.forgotPassword);

// Route reset password dengan kode verifikasi
router.post("/reset-password", authController.resetPassword);

// Route logout, butuh autentikasi token valid
router.post("/logout", verifyToken, authController.logout);

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

    // Ambil accessToken Google dari req.authInfo (tergantung konfigurasi passport)
    // Pastikan passport Google strategy mengirimkan accessToken di authInfo
    const googleAccessToken = req.authInfo?.accessToken || null;

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Encode tokens agar aman di URL
    const encodedToken = encodeURIComponent(token);
    const encodedGoogleAccessToken = encodeURIComponent(googleAccessToken);

    // Redirect ke frontend dengan token JWT dan googleAccessToken sebagai query parameter
    const frontendCallbackUrl = `${process.env.FRONTEND_URL || "https://fe-eticket.vercel.app"}/auth/google/callback?token=${encodedToken}&googleAccessToken=${encodedGoogleAccessToken}`;

    res.redirect(frontendCallbackUrl);
  }
);


module.exports = router;
