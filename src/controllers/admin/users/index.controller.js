// File: src/controllers/admin/users/index.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET User BUYER
exports.getAllBuyers = async (req, res) => {
  try {
    // Mengambil semua pengguna dengan role 'BUYER'
    const buyers = await prisma.user.findMany({
      where: { role: "BUYER" },
    });

    return res.json({
      message: "Buyers fetched successfully",
      data: buyers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching buyers", error: error.message });
  }
};
