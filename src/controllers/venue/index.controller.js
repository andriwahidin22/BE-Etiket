//file controllers/venueController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE VENUE
exports.createVenue = async (req, res) => {
  try {
    const { name, description, year } = req.body;
    const photo = req.file ? req.file.filename : null;

    const venue = await prisma.venue.create({
      data: { name, description, photo, year },
      select: { // Hanya pilih field yang ingin ditampilkan
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true
      }
    });

    res.status(201).json({
      status: "success",
      message: "Venue created successfully",
      data: venue
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create venue",
      error: error.message
    });
  }
};

// Untuk getAllVenues dan getVenueById juga perlu disesuaikan
exports.getAllVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true
      }
    });
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE VENUE
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const photo = req.file ? req.file.filename : undefined;

    const dataUpdate = { name, description };
    if (photo) dataUpdate.photo = photo;

    const updated = await prisma.venue.update({
      where: { id: Number(id) },
      data: dataUpdate,
    });

    res.json({
      status: "success",
      message: "Venue updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update venue",
      error: error.message,
    });
  }
};

// DELETE VENUE
exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.venue.delete({
      where: { id: Number(id) },
    });

    res.json({
      status: "success",
      message: `Venue with ID ${id} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete venue",
      error: error.message,
    });
  }
};

// GET ALL VENUES
exports.getVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET VENUE BY ID
exports.getVenueById = async (req, res) => {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    res.status(200).json({ status: "success", data: venue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
};