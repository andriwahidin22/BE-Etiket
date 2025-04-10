const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
    createVenue,
    getVenues,
    updateVenue,
    deleteVenue
} = require("../controllers/venueController");

// GET all venues
router.get("/", getVenues);

// POST: Create venue (dengan upload file)
router.post("/", upload.single("foto"), createVenue);

// PUT: Update venue (juga dengan foto jika ada)
router.put("/:id", upload.single("foto"), updateVenue);

// DELETE: Hapus venue
router.delete("/:id", deleteVenue);

module.exports = router;
