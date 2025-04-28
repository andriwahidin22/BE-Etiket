//file controllers/reviewController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Add/Update review
exports.upsertReview = async (req, res) => {
  try {
    const { score, comment } = req.body;
    const userId = req.user.id;

    // Ensure role is BUYER
    if (req.user.role !== "BUYER") {
      return res.status(403).json({ message: "Only buyers can submit reviews." });
    }

    const review = await prisma.review.upsert({
      where: { userId },
      update: {
        score,
        comment,
      },
      create: {
        userId,
        score,
        comment,
      },
      include: {
        user: {
          select: {
            fullName: true,
          }
        }
      }
    });

    res.status(200).json({
      message: "Review submitted successfully",
      data: review,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
};