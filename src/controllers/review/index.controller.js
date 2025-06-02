// controllers/reviewController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const generateReviewPDF = require("../../utils/generateReviewPDF");
const path = require("path");


/**
 * Mendapatkan semua ulasan
 */
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Hitung rata-rata rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.score, 0) /
          reviews.length
        : 0;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil ulasan:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data ulasan",
      reviews: [],
      averageRating: 0,
    });
  }
};

/**
 * Membuat atau memperbarui ulasan (UPSERT)
 */
exports.upsertReview = async (req, res) => {
  try {
    const { score, comment } = req.body;
    const userId = req.user.id;

    // Validasi peran pengguna
    if (req.user.role !== "BUYER") {
      return res.status(403).json({
        success: false,
        message: "Hanya pembeli yang dapat memberikan ulasan",
      });
    }

    // Validasi input
    if (typeof score !== "number" || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating harus berupa angka antara 1-5",
      });
    }

    // UPSERT operation
    const review = await prisma.review.upsert({
      where: { userId },
      update: { score, comment },
      create: {
        userId,
        score,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Ulasan berhasil disimpan",
      data: review,
    });
  } catch (error) {
    console.error("Gagal menyimpan ulasan:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menyimpan ulasan",
      error: error.message,
    });
  }
};

/**
 * Memperbarui ulasan tertentu
 */
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, comment } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (typeof score !== "number" || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating harus berupa angka antara 1-5",
      });
    }

    // Update ulasan hanya jika dimiliki oleh user
    const review = await prisma.review.update({
      where: {
        id: parseInt(id),
        userId: userId,
      },
      data: { score, comment },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Ulasan berhasil diperbarui",
      data: review,
    });
  } catch (error) {
    console.error("Gagal memperbarui ulasan:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui ulasan",
      error: error.message,
    });
  }
};

/**
 * Menghapus ulasan tertentu
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Hapus hanya jika ulasan dimiliki oleh user
    await prisma.review.delete({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Ulasan berhasil dihapus",
    });
  } catch (error) {
    console.error("Gagal menghapus ulasan:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus ulasan",
      error: error.message,
    });
  }
};

exports.generateReviewReportPDF = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length
        : 0;

    // Path ke output PDF
    const pdfPath = path.join(__dirname, "../../invoices/review-report.pdf");

    // Generate PDF
    await generateReviewPDF(
      {
        reviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
      },
      pdfPath
    );

    // Kirim file PDF ke client
    res.download(pdfPath, "review-report.pdf");
  } catch (error) {
    console.error("Gagal membuat PDF:", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat laporan ulasan dalam PDF",
    });
  }
};