//file routes/venue.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const venueController = require("../controllers/venueController");
const { verifyToken, isAdmin } = require("../middleware/auth");

// GET all venues
router.get("/", venueController.getVenues);

// POST, PUT, DELETE venue only for Admin
router.post("/", verifyToken, isAdmin, upload.single("photo"), venueController.createVenue);
router.put("/:id", verifyToken, isAdmin, upload.single("photo"), venueController.updateVenue);
router.delete("/:id", verifyToken, isAdmin, venueController.deleteVenue);

// GET venue by id
router.get('/:id', venueController.getVenueById);

module.exports = router;
