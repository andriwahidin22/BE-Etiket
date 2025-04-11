const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Verifikasi tiket berdasarkan kodePemesanan
exports.verifikasiTiket = async (req, res) => {
  try {
    const { kodePemesanan } = req.body;

    const pemesanan = await prisma.pemesanan.findUnique({
      where: { kodePemesanan }
    });

    if (!pemesanan) {
      return res.status(404).json({ message: "Kode pemesanan tidak ditemukan" });
    }

    if (pemesanan.statusVerifikasi) {
      return res.status(400).json({ message: "Tiket sudah diverifikasi sebelumnya" });
    }

    const verif = await prisma.pemesanan.update({
      where: { kodePemesanan },
      data: { statusVerifikasi: true }
    });

    res.status(200).json({
      message: "Tiket berhasil diverifikasi",
      data: verif
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal verifikasi tiket", error: error.message });
  }
};
