const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

exports.createPembayaran = async (req, res) => {
  try {
    const {
      userId,
      namaPengunjung,
      jenisTiketId,
      tanggalBerkunjung,
      jumlahTiket,
      statusPembayaran,
      tanggalTransaksi
    } = req.body;

    // Cek user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Cek tiket
    const tiket = await prisma.ticket.findUnique({ where: { id: jenisTiketId } });
    if (!tiket) {
      return res.status(404).json({ message: "Jenis tiket tidak ditemukan" });
    }

    // Hitung total pembayaran
    const totalPembayaran = tiket.hargaTiket * jumlahTiket;

    // Simpan pembayaran terlebih dahulu
    const pembayaran = await prisma.pembayaran.create({
      data: {
        totalPembayaran,
        statusPembayaran,
        tanggalTransaksi: new Date(tanggalTransaksi),
        // pemesananId akan diisi nanti jika pembayaran lunas
      }
    });

    let pemesanan = null;

    if (statusPembayaran.toLowerCase() === "lunas") {
      const kodePemesanan = `PMSN-${uuidv4().split("-")[0].toUpperCase()}`;

      // Buat pemesanan jika pembayaran berhasil
      pemesanan = await prisma.pemesanan.create({
        data: {
          kodePemesanan,
          namaPengunjung,
          jenisTiketId,
          tanggalBerkunjung: new Date(tanggalBerkunjung),
          jumlahTiket,
          totalPembelian: totalPembayaran, // ⬅️ disimpan di sini
          userId,
          pembayaran: {
            connect: { id: pembayaran.id }
          }
        }
      });

      // Update pembayaran dengan relasi ke pemesanan
      await prisma.pembayaran.update({
        where: { id: pembayaran.id },
        data: { pemesananId: pemesanan.id }
      });
    }

    res.status(201).json({
      status: "success",
      message: "Pembayaran berhasil",
      data: {
        pembayaran,
        pemesanan: pemesanan || null
      }
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal memproses pembayaran",
      error: error.message,
    });
  }
};

// Get all pembayaran
exports.getPembayaran = async (req, res) => {
  try {
    const pembayarans = await prisma.pembayaran.findMany({
      include: {
        pemesanan: {
          include: { jenisTiket: true },
        },
      },
    });
    res.status(200).json({
      status: "success",
      data: pembayarans,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Get by id
exports.getPembayaranById = async (req, res) => {
  try {
    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { pemesanan: { include: { jenisTiket: true } } },
    });

    if (!pembayaran) {
      return res.status(404).json({ message: "Pembayaran tidak ditemukan" });
    }

    res.status(200).json({ status: "success", data: pembayaran });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
