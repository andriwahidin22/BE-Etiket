//file controllers/venueController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE VENUE
exports.createVenue = async (req, res) => {
  try {
    const { name, description, year, category } = req.body;
    const photo = req.file ? req.file.filename : null;

    const venue = await prisma.venue.create({
      data: {
        name,
        description,
        photo,
        year,
        category, // kategori sekarang ditambahkan
      },
      select: {
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true,
        category: true,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Venue created successfully",
      data: venue,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create venue",
      error: error.message,
    });
  }
};

// GET ALL VENUES (with optional category filter)
exports.getAllVenues = async (req, res) => {  try {
    const { category } = req.query;

    const filter = {};
    if (category) {
      filter.category = category.toUpperCase(); // Sesuaikan kapitalisasi enum jika perlu
    }

    const venues = await prisma.venue.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true,
        category: true,
      },
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
    const { name, description, category } = req.body;
    const photo = req.file ? req.file.filename : undefined;

    // Daftar kategori valid sesuai enum VenueCategory di schema.prisma
    const allowedCategories = [
      "GEOLOGIKA",
      "HISTORIKA",
      "KERAMOLOGIKA",
      "ARKEOLOGIKA",
      "BIOLOGIKA",
      "NUMISMATIKA",
      "SENI_RUPA",
      "ETNOGRAFIKA",
      "FIOLOGIKA",
      "TEKNOLOGIKA",
    ];

    // Validasi kategori (jika diberikan)
    if (category && !allowedCategories.includes(category)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid category provided.",
      });
    }

    // Siapkan data untuk update
    const dataUpdate = {};
    if (name !== undefined) dataUpdate.name = name;
    if (description !== undefined) dataUpdate.description = description;
    if (category !== undefined) dataUpdate.category = category;
    if (photo) dataUpdate.photo = photo;

    // Logging untuk debug (opsional)
    console.log(`Updating venue ID ${id} with:`, dataUpdate);
    console.log("BODY:", req.body);
    console.log("CATEGORY:", req.body.category);

    // Eksekusi update
    const updated = await prisma.venue.update({
      where: { id: Number(id) },
      data: dataUpdate,
      select: {
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true,
        category: true,
      },
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

// GET VENUE BY ID
exports.getVenueById = async (req, res) => {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        year: true,
        description: true,
        photo: true,
        category: true,
      },
    });

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    res.status(200).json({ status: "success", data: venue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
