const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Tambah / Update rating
exports.upsertRating = async (req, res) => {
  try {
    const { skor, komentar } = req.body;
    const userId = req.user.id;

    // Pastikan role adalah PEMBELI
    if (req.user.role !== "PEMBELI") {
      return res.status(403).json({ message: "Hanya user pembeli yang bisa memberi rating." });
    }

    const rating = await prisma.rating.upsert({
        where: { userId },
        update: {
          skor,
          komentar,
        },
        create: {
          userId,
          skor,
          komentar,
        },
        include: {
          user: {
            select: {
              namaLengkap: true,
            }
          }
        }
      });
      

    res.status(200).json({
      message: "Rating berhasil disimpan",
      data: rating,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menyimpan rating", error: error.message });
  }
};
