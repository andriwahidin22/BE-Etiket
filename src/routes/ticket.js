const express = require('express');
const router = express.Router();

// ✅ Import semua fungsi dari controller
const ticketController = require('../controllers/ticketController');

// Middleware untuk autentikasi dan otorisasi
const { verifyToken, isAdmin } = require("../middleware/auth");

// Destructuring dari ticketController
const {
  createTicket,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketById
} = ticketController;

// Routes CRUD
// POST, PUT, DELETE hanya boleh diakses oleh Admin
router.post("/", verifyToken, isAdmin, createTicket);
router.put("/:id", verifyToken, isAdmin, updateTicket);
router.delete("/:id", verifyToken, isAdmin, deleteTicket);

// GET semua tiket
router.get("/", getAllTickets);

// GET tiket berdasarkan ID
router.get('/:id', getTicketById);

module.exports = router;
