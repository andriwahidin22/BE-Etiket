const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");

// CREATE Pemesanan
exports.createPemesanan = async (req, res) => {
  try {
    const { userId, namaPengunjung, jenisTiketId, tanggalBerkunjung, jumlahTiket } = req.body;

    // Cari user berdasarkan userId
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Cari jenis tiket berdasarkan ID yang dikirim
    const tiket = await prisma.ticket.findUnique({ where: { id: jenisTiketId } });
    if (!tiket) {
      return res.status(404).json({ message: "Jenis tiket tidak ditemukan" });
    }

    // Hitung total pembelian
    const totalPembelian = tiket.hargaTiket * jumlahTiket;

    // Generate kode pemesanan unik
    const kodePemesanan = `PMSN-${uuidv4().split("-")[0].toUpperCase()}`;

    // Buat pemesanan
    const pemesanan = await prisma.pemesanan.create({
      data: {
        kodePemesanan,
        namaPengunjung,
        jenisTiketId,
        tanggalBerkunjung: new Date(tanggalBerkunjung),
        jumlahTiket,
        totalPembelian,
        userId,  // Relasi dengan User
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
      include: { jenisTiket: true, user: true }  // Menyertakan user untuk melihat siapa yang memesan
    });
    res.status(200).json({
      status: "success",
      data: pemesanans
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Pemesanan By ID
exports.getPemesananById = async (req, res) => {
  try {
    const pemesanan = await prisma.pemesanan.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { jenisTiket: true }
    });

    if (!pemesanan) {
      return res.status(404).json({ message: "Pemesanan tidak ditemukan" });
    }

    res.status(200).json({ status: "success", data: pemesanan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
