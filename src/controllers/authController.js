const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET;

//REGIS Khusus user pembeli
exports.register = async (req, res) => {
  const { email, password, namaLengkap, nomorTelp } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(400).json({ msg: "Email sudah terdaftar" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "PEMBELI",
      namaLengkap,
      nomorTelp,
    },
  });

  res.json({ msg: "User berhasil didaftarkan", user });
};

//LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ msg: "Password salah" });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: "1d",
  });

  res.json({ msg: "Login berhasil", token });
};
