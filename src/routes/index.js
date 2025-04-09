const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/venue', indexController.getAllVenue);
router.get('/ticket', indexController.getAllTicket);

module.exports = router;
