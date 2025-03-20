const express = require("express");
const { createAdmin, getAdminByUsername } = require("../models/adminModel");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await getAdminByUsername(username);
        if (rows.length > 0) {
            const isMatch = await bcrypt.compare(password, rows[0].password);
            if (isMatch) {
                return res.status(200).json({ message: "Login successful!" });
            }
        }
        res.status(401).json({ message: "Invalid username or password." });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
