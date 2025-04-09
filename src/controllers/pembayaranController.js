const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create a new pembayaran (payment)
exports.createPembayaran = async (req, res) => {
    try {
      const { pemesananId, statusPembayaran, tanggalTransaksi } = req.body;
  
      // Cek apakah pemesanan ada
      const pemesanan = await prisma.pemesanan.findUnique({
        where: { id: pemesananId }
      });
  
      if (!pemesanan) {
        return res.status(404).json({
          status: "error",
          message: "Pemesanan tidak ditemukan"
        });
      }
  
      // Ambil totalPembelian dari pemesanan
      const totalPembayaran = pemesanan.totalPembelian;
  
      const pembayaran = await prisma.pembayaran.create({
        data: {
          pemesananId,
          totalPembayaran,
          statusPembayaran,
          tanggalTransaksi: new Date(tanggalTransaksi)
        }
      });
  
      res.status(201).json({
        status: "success",
        message: "Pembayaran berhasil ditambahkan",
        data: pembayaran
      });
  
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Gagal memproses pembayaran",
        error: error.message
      });
    }
  };
  
// Get all pembayaran
exports.getPembayaran = async (req, res) => {
    try {
      const pembayarans = await prisma.pembayaran.findMany({
        include: { 
          pemesanan: {
            include: { jenisTiket: true }
          }
        }
      });
      res.status(200).json({
        status: "success",
        data: pembayarans
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  