const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create a new venue
exports.createVenue = async (req, res) => {
  try {
    const { kode, namaVenue, keterangan } = req.body;
    const foto = req.file ? req.file.filename : null;

    const venue = await prisma.venue.create({
      data: { kode, namaVenue, keterangan, foto }
    });

    res.status(201).json({
      status: "success",
      message: "Venue berhasil dibuat",
      data: venue
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal menambahkan venue",
      error: error.message
    });
  }
};


// PUT - Update venue
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { kode, namaVenue, keterangan } = req.body;
    const foto = req.file ? req.file.filename : undefined; // jangan update foto kalau tidak upload baru

    const dataUpdate = { kode, namaVenue, keterangan };
    if (foto) dataUpdate.foto = foto;

    const updated = await prisma.venue.update({
      where: { id: Number(id) },
      data: dataUpdate,
    });

    res.json({
      status: "success",
      message: "Venue berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal memperbarui venue",
      error: error.message,
    });
  }
};


// DELETE - Hapus venue
exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.venue.delete({
      where: { id: Number(id) },
    });

    res.json({
      status: "success",
      message: `Venue dengan ID ${id} berhasil dihapus`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus venue",
      error: error.message,
    });
  }
};

// Get all venues
exports.getVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
