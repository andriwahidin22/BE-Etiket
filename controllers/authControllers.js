const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username dan password harus diisi!" });
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });

    if (results.length === 0)
      return res.status(401).json({ message: "Username tidak ditemukan!" });

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log("Apakah password cocok?", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah!" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login berhasil!", token });
  });
};
