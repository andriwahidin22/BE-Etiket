//file controllers/ticketController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE TICKET
exports.createTicket = async (req, res) => {
  try {
    const { code, type, price, terms } = req.body;
    const ticket = await prisma.ticket.create({
      data: { code, type, price, terms },
    });
    res.json({ msg: "Ticket created successfully", ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE TICKET
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type, price, terms } = req.body;

    const updated = await prisma.ticket.update({
      where: { id: Number(id) },
      data: { code, type, price, terms },
    });

    res.json({
      status: "success",
      message: "Ticket updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

// DELETE TICKET
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.ticket.delete({
      where: { id: Number(id) },
    });

    res.json({
      status: "success",
      message: `Ticket with ID ${id} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};

// GET ALL TICKETS
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET TICKET BY ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ status: "success", data: ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};