const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/payment/notification.controller');

// Midtrans akan mengirim POST request ke endpoint ini
router.post('/', notificationController.handlePaymentNotification);

module.exports = router;