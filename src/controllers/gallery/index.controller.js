const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE Gallery (Admin only)
exports.createGallery = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Akses hanya untuk admin" });
    }

    const { title, description, category } = req.body;

    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: "Image file is required" });
    }

    if (!title || !category) {
      return res.status(400).json({ message: "Title and category are required" });
    }

    const imageUrl = req.file.filename;

    const newGallery = await prisma.gallery.create({
      data: { title, description, category, imageUrl },
    });

    res.status(201).json({ status: "success", data: newGallery });
  } catch (error) {
    console.error("Error creating gallery:", error);
    res.status(500).json({ message: "Failed to create gallery" });
  }
};

// READ all Galleries (for everyone, with optional filter)
exports.getGalleries = async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const galleries = await prisma.gallery.findMany({ where });
    res.status(200).json(galleries);
  } catch (error) {
    console.error("Error fetching galleries:", error);
    res.status(500).json({ message: "Failed to fetch galleries" });
  }
};

// READ Gallery by ID (for everyone)
exports.getGalleryById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gallery = await prisma.gallery.findUnique({ where: { id } });

    if (!gallery) {
      return res.status(404).json({ message: "Gallery not found" });
    }

    res.status(200).json(gallery);
  } catch (error) {
    console.error("Error fetching gallery by ID:", error);
    res.status(500).json({ message: "Failed to fetch gallery" });
  }
};

// UPDATE Gallery by ID (Admin only)
exports.updateGallery = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Akses hanya untuk admin" });
    }

    const id = parseInt(req.params.id);
    const { title, description, imageUrl, category } = req.body;

    const updatedGallery = await prisma.gallery.update({
      where: { id },
      data: { title, description, imageUrl, category },
    });

    res.status(200).json({ message: "Gallery updated", data: updatedGallery });
  } catch (error) {
    console.error("Error updating gallery:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Gallery not found" });
    }
    res.status(500).json({ message: "Failed to update gallery" });
  }
};

// DELETE Gallery by ID (Admin only)
exports.deleteGallery = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Akses hanya untuk admin" });
    }

    const id = parseInt(req.params.id);
    await prisma.gallery.delete({ where: { id } });

    res.status(200).json({ message: "Gallery deleted successfully" });
  } catch (error) {
    console.error("Error deleting gallery:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Gallery not found" });
    }
    res.status(500).json({ message: "Failed to delete gallery" });
  }
};
