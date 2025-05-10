const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

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
    return res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};
