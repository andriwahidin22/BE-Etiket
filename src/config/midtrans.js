const midtransClient = require('midtrans-client');

const isProduction = process.env.MIDTRANS_SANDBOX === 'false';
const serverKey = isProduction 
  ? process.env.MIDTRANS_SERVER_KEY_PRODUCTION
  : process.env.MIDTRANS_SERVER_KEY_SANDBOX;

const snap = new midtransClient.Snap({
  isProduction,
  serverKey,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Core API untuk langsung berinteraksi dengan Midtrans
const core = new midtransClient.CoreApi({
  isProduction,
  serverKey,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = { snap, core };