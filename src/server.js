require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/ticket");
const venueRoutes = require("./routes/venue");
const orderRoutes = require("./routes/order");
const paymentRoutes = require("./routes/payment");
const reviewRoutes = require("./routes/review");
const dashboardRoutes = require("./routes/admin/dashboardRoutes");
const verificationRoutes = require("./routes/admin/verificationRoutes");

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health Check Endpoint
app.get("/api/status", (req, res) => {
  res.json({ 
    status: "Backend is running",
    port: process.env.PORT,
    environment: process.env.NODE_ENV || "development"
  });
});

// Routes
app.use('/api/index', indexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/venue", venueRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/verification", verificationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: err.message 
  });
});

// BE (Express.js)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  █               █
  █   BACKEND     █
  █   READY       █
  █               █
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
  `);
});