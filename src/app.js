// File: src/app.js
require("dotenv").config();
require('events').EventEmitter.defaultMaxListeners = 20; // Tambahkan ini
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const midtransErrorHandler = require('./middleware/midtransError');

const apiRoutes = require("./routes/api.route");

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health Check
app.get("/api/status", (req, res) => {
  res.json({
    status: "Backend is running",
    port: process.env.PORT,
    environment: process.env.NODE_ENV || "development"
  });
});

// Mount all API routes
app.use("/api", apiRoutes);

// Midtrans Error Handler - Pindahkan sebelum global error handler
app.use(midtransErrorHandler);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

module.exports = app;