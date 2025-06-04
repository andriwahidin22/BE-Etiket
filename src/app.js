require("dotenv").config();
require('events').EventEmitter.defaultMaxListeners = 20;
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const midtransErrorHandler = require('./middleware/midtransError');

const apiRoutes = require("./routes/api.route");

const app = express();

// Enhanced CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL, 
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));

// Manual Request Logger (Before All Routes)
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// Handle preflight requests
app.options('*', cors(corsOptions));

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

// Mount all API routes
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
