const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/venue', indexController.getAllVenue);
router.get('/ticket', indexController.getAllTicket);
router.get('/venue/:id', indexController.getVenueById);


module.exports = router;
