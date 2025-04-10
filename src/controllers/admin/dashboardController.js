const prisma = require("@prisma/client").PrismaClient;
const prismaClient = new prisma();

// Get statistik
exports.getDashboard = async (req, res) => {
  try {
    // Mengambil data pemesanan
    const totalPemesanan = await prismaClient.pemesanan.count();
    const totalPembayaran = await prismaClient.pembayaran.count();
    const totalTiketTerjual = await prismaClient.pemesanan.aggregate({
      _sum: {
        jumlahTiket: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Dashboard statistics fetched successfully",
      data: {
        totalPemesanan,
        totalPembayaran,
        totalTiketTerjual: totalTiketTerjual._sum.jumlahTiket || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil statistik dashboard",
      error: error.message,
    });
  }
};

// Get Pemesanan
exports.getPemesananDetails = async (req, res) => {
  try {
    const pemesananDetails = await prismaClient.pemesanan.findMany({
      include: {
        jenisTiket: true,
        pembayaran: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: pemesananDetails,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil detail pemesanan",
      error: error.message,
    });
  }
};
