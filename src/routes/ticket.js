const express = require('express');
const router = express.Router();

// ✅ Import semua fungsi dari controller
const ticketController = require('../controllers/ticketController');

// Pakai destructuring agar lebih clean
const {
  createTicket,
  getAllTickets,
  updateTicket,
  deleteTicket,
} = ticketController;

// Routes
router.post("/", createTicket);
router.get("/", getAllTickets);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

module.exports = router;
