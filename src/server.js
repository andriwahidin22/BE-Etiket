require("dotenv").config();
const express = require("express");
const cors = require("cors");

const indexRoutes = require('./routes/index');
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/ticket");
const venueRoutes = require("./routes/venue");
const pemesananRoutes = require("./routes/pemesanan");
const pembayaranRoutes = require("./routes/pembayaran");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/index', indexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/venue", venueRoutes);
app.use("/api/pemesanan", pemesananRoutes);
app.use("/api/pembayaran", pembayaranRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
