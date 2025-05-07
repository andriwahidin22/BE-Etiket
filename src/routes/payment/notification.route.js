// File: src/routes/payment/notification.route.js


const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/payment/notification.controller');

router.post('/', notificationController.handleNotification);

module.exports = router;