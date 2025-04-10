const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//GET  VENUE
exports.getAllVenue = async (req, res) => {
  try {
    const venue = await prisma.venue.findMany({
      select: {
        id: true,
        namaVenue: true,
        keterangan: true,
        foto: true,
      },
    });
    res.status(200).json({
      status: "success",
      message: "Data venue ditemukan",
      data: venue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

//GET VENUE By ID
exports.getVenueById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      return res.status(404).json({
        status: "error",
        message: "Venue tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Detail venue ditemukan",
      data: venue,
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
        hargaTiket: true,
      },
    });
    res.status(200).json({
      status: "success",
      message: "Data tiket ditemukan",
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
