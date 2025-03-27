const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger"); // Import logger


exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username dan password harus diisi!"
    });
  }

  const query = "SELECT * FROM users WHERE username = ?"; 
  logger.info(`Login attempt for username: ${username}`); // Log login attempt
  db.query(query, [username], async (err, results) => {
    if (err)
      logger.error("Database error: ", err); // Log database error
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err
      });

    if (results.length === 0)
      logger.warn(`Username not found: ${username}`); // Log warning for username not found
      return res.status(401).json({
        success: false,
        message: "Username tidak ditemukan!"
      });

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log("Apakah password cocok?", isPasswordValid);

    if (!isPasswordValid) {
      logger.warn(`Invalid password for username: ${username}`); // Log warning for invalid password
      return res.status(401).json({
        success: false,
        message: "Password salah!"
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`Login successful for username: ${username}`); // Log successful login
    res.status(200).json({
      success: true,
      message: "Login berhasil!",
      token: token
    });
  });
};
