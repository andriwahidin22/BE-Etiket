const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Daftar kategori yang valid (harus sesuai dengan enum GalleryCategory di schema.prisma)
const validCategories = ["GALLERY", "FACILITY", "EVENT"];

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
      return res.status(400).json({ message: "Title dan category wajib diisi" });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Kategori tidak valid. Pilihan: GALLERY, FACILITY, EVENT" });
    }

    const imageUrl = req.file.filename;

    const newGallery = await prisma.gallery.create({
      data: { title, description, category, imageUrl },
    });

    res.status(201).json({ status: "success", data: newGallery });
  } catch (error) {
    console.error("Error creating gallery:", error);
    res.status(500).json({ message: "Gagal membuat galeri" });
  }
};

// READ all Galleries (for everyone, with optional filter)
exports.getGalleries = async (req, res) => {
  try {
    const { category } = req.query;

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Kategori tidak valid dalam filter" });
    }

    const where = category ? { category } : {};

    const galleries = await prisma.gallery.findMany({ where });
    res.status(200).json(galleries);
  } catch (error) {
    console.error("Error fetching galleries:", error);
    res.status(500).json({ message: "Gagal mengambil data galeri" });
  }
};

// READ Gallery by ID (for everyone)
exports.getGalleryById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gallery = await prisma.gallery.findUnique({ where: { id } });

    if (!gallery) {
      return res.status(404).json({ message: "Galeri tidak ditemukan" });
    }

    res.status(200).json(gallery);
  } catch (error) {
    console.error("Error fetching gallery by ID:", error);
    res.status(500).json({ message: "Gagal mengambil galeri" });
  }
};

// UPDATE Gallery by ID (Admin only)
exports.updateGallery = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Akses hanya untuk admin" });
    }

    const id = parseInt(req.params.id);
    const { title, description, category } = req.body;

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Kategori tidak valid" });
    }

    // Ambil image file jika ada
    let imageUrl;
    if (req.file && req.file.filename) {
      imageUrl = req.file.filename;
    }

    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(category && { category }),
      ...(imageUrl && { imageUrl }),
    };

    const updatedGallery = await prisma.gallery.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ message: "Galeri berhasil diperbarui", data: updatedGallery });
  } catch (error) {
    console.error("Error updating gallery:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Galeri tidak ditemukan" });
    }
    res.status(500).json({ message: "Gagal memperbarui galeri" });
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

    res.status(200).json({ message: "Galeri berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting gallery:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Galeri tidak ditemukan" });
    }
    res.status(500).json({ message: "Gagal menghapus galeri" });
  }
};
