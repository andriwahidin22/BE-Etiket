// file server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const indexRoutes = require('./routes/index');
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/ticket");
const venueRoutes = require("./routes/venue");
const orderRoutes = require("./routes/order");
const paymentRoutes = require("./routes/payment");
const reviewRoutes = require("./routes/review");

// Admin routes
const dashboardRoutes = require("./routes/admin/dashboardRoutes");
const verificationRoutes = require("./routes/admin/verificationRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads", express.static("uploads"));

// Routing
app.use('/api/index', indexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/venue", venueRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);

// Admin routes
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/verification", verificationRoutes);

// Server listen
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));