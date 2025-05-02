//file controllers/authController.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET;

// Register untuk khusus buyers
exports.register = async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(400).json({ msg: "Email already registered" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "BUYER",
      fullName,
      phoneNumber,
    },
  });

  res.json({ msg: "User registered successfully", user });
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ msg: "Invalid password" });

  const token = jwt.sign({ 
    id: user.id, 
    role: user.role,
    fullName: user.fullName,
    email: user.email
  }, SECRET, {
    expiresIn: "1d",
  });

  res.json({ 
    msg: "Login successful", 
    token,
    role: user.role,  // Add this line to return the role
    user: {          // Optional: you can return more user data if needed
      id: user.id,
      email: user.email,
      fullName: user.fullName
    }
  });
};