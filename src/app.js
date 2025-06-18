require("dotenv").config();
require('events').EventEmitter.defaultMaxListeners = 20;
const express = require("express");
const path = require("path");
const helmet = require("helmet");

const midtransErrorHandler = require('./middleware/midtransError');
const apiRoutes = require("./routes/api.route");

const app = express();

// Security Middleware
app.use(helmet());

// Manual Request Logger
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health Check Endpoint
app.get("/api/status", (req, res) => {
  console.log("✅ [STATUS CHECK] Backend is alive.");
  res.json({
    status: "Backend is running",
    port: process.env.PORT,
    environment: process.env.NODE_ENV || "development"
  });
});

// API Routes
app.use("/api", apiRoutes);

// Midtrans Error Handler
app.use((err, req, res, next) => {
  if (err.message.includes('Midtrans')) {
    console.error(`❌ [${req.method}] ${req.originalUrl} - Midtrans Error:`, err);
    return res.status(502).json({
      status: "error",
      message: "Payment gateway error"
    });
  }
  next(err);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`❌ [${req.method}] ${req.originalUrl} - Internal Server Error`);
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

module.exports = app;
