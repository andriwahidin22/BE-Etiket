const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//CREATE
exports.createTicket = async (req, res) => {
  try {
    const { kode, jenisTiket, hargaTiket } = req.body;
    // Membuat ticket baru ke database
    const ticket = await prisma.ticket.create({
      data: { kode, jenisTiket, hargaTiket },
    });
    // Mengembalikan response sukses beserta data tiket yang baru dibuat
    res.json({ msg: "Ticket berhasil dibuat", ticket });
  } catch (error) {
    // Mengembalikan error jika terjadi masalah
    res.status(500).json({ error: error.message });
  }
};

// PUT - Update tiket
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { kode, jenisTiket, hargaTiket } = req.body;

    const updated = await prisma.ticket.update({
      where: { id: Number(id) },
      data: { kode, jenisTiket, hargaTiket },
    });

    res.json({
      status: "success",
      message: "Tiket berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal memperbarui tiket",
      error: error.message,
    });
  }
};

// DELETE - Hapus tiket
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.ticket.delete({
      where: { id: Number(id) },
    });

    res.json({
      status: "success",
      message: `Tiket dengan ID ${id} berhasil dihapus`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus tiket",
      error: error.message,
    });
  }
};

// Get all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
