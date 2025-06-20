const express = require("express");
const router = express.Router();
const venueController = require("../../controllers/venue/index.controller"); // path disesuaikan jika perlu
const { verifyToken, isAdmin } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

// ======================
// VENUE ROUTES
// ======================

// Public - Get all venues
router.get("/", venueController.getAllVenues);

// Public - Get venue by ID
router.get("/:id", venueController.getVenueById);

// Admin only - Create venue
router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.single("photo"),
  venueController.createVenue
);

// Admin only - Update venue
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("photo"),
  venueController.updateVenue
);

// Admin only - Delete venue
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  venueController.deleteVenue
);

module.exports = router;
