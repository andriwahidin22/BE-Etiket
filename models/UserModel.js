const db = require("../config/db");

const getUserByUsername = (username, callback) => {
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) return callback(err, null);
    callback(null, results[0]); // Ambil satu user saja
  });
};

module.exports = { getUserByUsername };
