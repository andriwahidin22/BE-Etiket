const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

//CREATE
exports.createPemesanan = async (req, res) => {
  try {
    const {
      namaPengunjung,
      jenisTiketId,
      tanggalBerkunjung,
      jumlahTiket
    } = req.body;

    // Cari jenis tiket berdasarkan ID yang dikirim
    const tiket = await prisma.ticket.findUnique({ where: { id: jenisTiketId } });
    if (!tiket) {
      return res.status(404).json({ message: "Jenis tiket tidak ditemukan" });
    }

    // Hitung total pembelian dan generate kode pemesanan unik
    const totalPembelian = tiket.hargaTiket * jumlahTiket;
    const kodePemesanan = `PMSN-${uuidv4().split("-")[0].toUpperCase()}`;

    const pemesanan = await prisma.pemesanan.create({
      data: {
        kodePemesanan,
        namaPengunjung,
        jenisTiketId,
        tanggalBerkunjung: new Date(tanggalBerkunjung),
        jumlahTiket,
        totalPembelian
      }
    });

    res.status(201).json({
      status: "success",
      message: "Pemesanan berhasil ditambahkan",
      data: pemesanan
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal membuat pemesanan",
      error: error.message
    });
  }
};

// GET all Pemesanan 
exports.getPemesanan = async (req, res) => {
  try {
    const pemesanans = await prisma.pemesanan.findMany({
      include: { jenisTiket: true }
    });
    res.status(200).json({
      status: "success",
      data: pemesanans
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
