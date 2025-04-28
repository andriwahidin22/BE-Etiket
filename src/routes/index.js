const express = require("express");
const router = express.Router();
const indexController = require("../controllers/indexController");

// Gunakan langsung tanpa destructuring untuk menghindari error
router.get("/venues", indexController.getAllVenues);
router.get("/venues/:id", indexController.getVenueById);
router.get("/tickets", indexController.getAllTickets);

module.exports = router;