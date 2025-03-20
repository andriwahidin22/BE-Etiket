const db = require("../config/db");
const bcrypt = require("bcryptjs");

const createAdmin = async (username, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return db.promise().query("INSERT INTO admins (username, password) VALUES (?, ?)", [username, hashedPassword]);
};

const getAdminByUsername = (username) => {
  return db.promise().query("SELECT * FROM admins WHERE username = ?", [username]);
};

module.exports = { createAdmin, getAdminByUsername };