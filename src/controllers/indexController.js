const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//GET  VENUE
exports.getAllVenue = async (req, res) => {
  try {
    const venue = await prisma.venue.findMany({
      select: {
        id: true,
        namaVenue: true,
        keterangan: true,
        foto: true
      }
    });
    res.status(200).json({
      status: "success",
      message: "Data venue ditemukan",
      data: venue
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

//GET TICKET
exports.getAllTicket = async (req, res) => {
  try {
    const ticket = await prisma.ticket.findMany({
      select: {
        id: true,
        kode: true,
        jenisTiket: true,
        hargaTiket: true
      }
    });
    res.status(200).json({
      status: "success",
      message: "Data tiket ditemukan",
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
