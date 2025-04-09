const express = require("express");
const router = express.Router();
const {
    createVenue,
    getVenues,
    updateVenue,
    deleteVenue
  } = require("../controllers/venueController");
  

// POST /api/venue - Create Venue
router.post("/", createVenue);
router.get("/", getVenues);
router.put("/:id", updateVenue);
router.delete("/:id", deleteVenue);



module.exports = router;
