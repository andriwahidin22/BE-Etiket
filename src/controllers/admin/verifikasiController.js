const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const verifikasiTiket = async (req, res) => {
  const { kodePemesanan } = req.body;

  try {
    const pemesanan = await prisma.pemesanan.findUnique({
      where: { kodePemesanan },
    });

    if (!pemesanan) {
      return res.status(404).json({ message: "Tiket tidak ditemukan" });
    }

    // Format tanggal hari ini dan tanggal berkunjung (tanpa jam)
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const visitDate = new Date(pemesanan.tanggalBerkunjung);
    const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

    // Tiket sudah kadaluarsa
    if (visitDateOnly < todayDate) {
      await prisma.pemesanan.update({
        where: { id: pemesanan.id },
        data: { statusKehadiran: "EXPIRED" },
      });
      return res.status(400).json({ message: "Tiket sudah kadaluarsa (EXPIRED)" });
    }

    // Tiket belum berlaku
    if (visitDateOnly > todayDate) {
      return res.status(400).json({ message: "Tiket belum berlaku. Silakan datang di tanggal yang ditentukan." });
    }

    // Sudah diverifikasi sebelumnya
    if (pemesanan.statusKehadiran === "SUDAH_DATANG") {
      return res.status(400).json({ message: "Tiket sudah diverifikasi sebelumnya." });
    }

    // Verifikasi (SUDAH_DATANG)
    await prisma.pemesanan.update({
      where: { id: pemesanan.id },
      data: { statusKehadiran: "SUDAH_DATANG" },
    });

    return res.status(200).json({ message: "Tiket berhasil diverifikasi. Selamat datang!" });

  } catch (error) {
    console.error("Verifikasi gagal:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server", error: error.message });
  }
};

module.exports = { verifikasiTiket };
