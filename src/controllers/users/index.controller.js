const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

// GET Profile
exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch user profile", details: err.message });
  }
};

// PUT profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id; // Mengambil ID user dari token yang terverifikasi
  const { fullName, phoneNumber, password } = req.body;

  try {
    // Data yang akan diperbarui, email tidak termasuk
    const dataToUpdate = {
      fullName,
      phoneNumber,
    };

    // Jika password ada, hash password baru
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      dataToUpdate.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email, // Menampilkan email yang tidak bisa diubah
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update profile", details: err.message });
  }
};
