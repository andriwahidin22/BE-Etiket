//src/controllers/gallery/index.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE Gallery
exports.createGallery = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    // Cek apakah file ada dan valid
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // Simpan filename sebagai imageUrl
    const imageUrl = req.file.filename;

    // Validasi sederhana agar title dan category tidak kosong (opsional, bisa ditambah)
    if (!title || !category) {
      return res.status(400).json({ message: "Title and category are required" });
    }

    const newGallery = await prisma.gallery.create({
      data: {
        title,
        description,
        category,
        imageUrl,
      },
    });

    res.status(201).json({ status: "success", data: newGallery });
  } catch (error) {
    console.error("Error creating gallery:", error);
    res.status(500).json({ message: "Failed to create gallery" });
  }
};

// READ all Galleries (with optional filter by category)
exports.getGalleries = async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const galleries = await prisma.gallery.findMany({ where });
    res.json(galleries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch galleries" });
  }
};

// READ Gallery by ID
exports.getGalleryById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gallery = await prisma.gallery.findUnique({
      where: { id },
    });
    if (!gallery) {
      return res.status(404).json({ message: "Gallery not found" });
    }
    res.json(gallery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch gallery" });
  }
};

// UPDATE Gallery by ID
exports.updateGallery = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, imageUrl, category } = req.body;

    const updatedGallery = await prisma.gallery.update({
      where: { id },
      data: { title, description, imageUrl, category },
    });

    res.json(updatedGallery);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      // Record not found
      return res.status(404).json({ message: "Gallery not found" });
    }
    res.status(500).json({ message: "Failed to update gallery" });
  }
};

// DELETE Gallery by ID
exports.deleteGallery = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.gallery.delete({ where: { id } });
    res.json({ message: "Gallery deleted successfully" });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Gallery not found" });
    }
    res.status(500).json({ message: "Failed to delete gallery" });
  }
};
