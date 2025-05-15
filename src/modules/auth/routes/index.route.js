const express = require("express");
const router = express.Router();
<<<<<<< HEAD:src/routes/auth/index.route.js
const { register, login } = require("../../controllers/auth/index.controller");
=======
const passport = require('@/config/passport');
const { register, login, verifyEmail, resendVerificationCode } = require('../controllers/index.controller');
const { verifyToken, isAdmin } = require('@/middleware/auth');
>>>>>>> a6733ec (Feat: Modular Struktur Folder):src/modules/auth/routes/index.route.js

router.post("/register", register);
router.post("/login", login);

module.exports = router;
