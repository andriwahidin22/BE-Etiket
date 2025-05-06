//file controllers/indexController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET ALL VENUES
exports.getAllVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        photo: true,
      },
    });
    res.status(200).json({
      status: "success",
      message: "Venues data retrieved",
      data: venues,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET VENUE BY ID
exports.getVenueById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      return res.status(404).json({
        status: "error",
        message: "Venue not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Venue details retrieved",
      data: venue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// GET ALL TICKETS
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        code: true,
        type: true,
        price: true,
      },
    });
    res.status(200).json({
      status: "success",
      message: "Tickets data retrieved",
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};