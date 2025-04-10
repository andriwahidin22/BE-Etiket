const express = require('express');
const router = express.Router();

// ✅ Import semua fungsi dari controller
const ticketController = require('../controllers/ticketController');

// destructuring
const {
  createTicket,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketById
} = ticketController;

// Routes CRUD
router.post("/", createTicket);
router.get("/", getAllTickets);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

//get by id
router.get('/:id', getTicketById);

module.exports = router;
