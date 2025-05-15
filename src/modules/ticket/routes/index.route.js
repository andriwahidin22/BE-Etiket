//file routes/ticket.js

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/index.controller');
const { verifyToken, isAdmin } = require('@/middleware/auth');

const {
  createTicket,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketById
} = ticketController;

// Routes CRUD
// POST, PUT, DELETE only accessible by Admin
router.post("/", verifyToken, isAdmin, createTicket);
router.put("/:id", verifyToken, isAdmin, updateTicket);
router.delete("/:id", verifyToken, isAdmin, deleteTicket);

// GET all tickets
router.get("/", getAllTickets);

// GET ticket by ID
router.get('/:id', getTicketById);

module.exports = router;