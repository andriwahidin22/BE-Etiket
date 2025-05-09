const midtransClient = require('midtrans-client');

// Pastikan environment variables sudah benar
const isProduction = false; // Sandbox mode
const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-tTOkKPYle-0yjGfITrEx-0Cv';

// Snap Client
const snap = new midtransClient.Snap({
  isProduction,
  serverKey,
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-QSGS1ln9kbEnOgMU'
});

// Core API Client
const core = new midtransClient.CoreApi({
  isProduction,
  serverKey,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
  apiVersion: 'v2',
  overrideNotificationUrl: process.env.MIDTRANS_NOTIFICATION_URL
});

module.exports = { snap, core };