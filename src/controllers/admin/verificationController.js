const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const verifyTicket = async (req, res) => {
  const { orderCode } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { orderCode },
    });

    if (!order) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Format today's date and visit date (without time)
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const visitDate = new Date(order.visitDate);
    const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

    // Ticket expired
    if (visitDateOnly < todayDate) {
      await prisma.order.update({
        where: { id: order.id },
        data: { attendanceStatus: "EXPIRED" },
      });
      return res.status(400).json({ message: "Ticket has expired (EXPIRED)" });
    }

    // Ticket not yet valid
    if (visitDateOnly > todayDate) {
      return res.status(400).json({ message: "Ticket is not yet valid. Please come on the specified date." });
    }

    // Already verified
    if (order.attendanceStatus === "ARRIVED") {
      return res.status(400).json({ message: "Ticket has already been verified." });
    }

    // Verify ticket (ARRIVED)
    await prisma.order.update({
      where: { id: order.id },
      data: { attendanceStatus: "ARRIVED" },
    });

    return res.status(200).json({ message: "Ticket successfully verified. Welcome!" });

  } catch (error) {
    console.error("Verification failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { verifyTicket };