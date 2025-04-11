require("dotenv").config(); //Load env
const express = require("express");
const cors = require("cors");
const path = require("path");

const indexRoutes = require('./routes/index');
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/ticket");
const venueRoutes = require("./routes/venue");
const pemesananRoutes = require("./routes/pemesanan");
const pembayaranRoutes = require("./routes/pembayaran");

//admin
const dashboardRoutes = require("./routes/admin/dashboardRoutes");
const verifikasiRoutes = require("./routes/admin/verifikasiRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ untuk handle form-data juga (buat upload)
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files (foto, dll)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads", express.static("uploads"));

// ✅ Routing
app.use('/api/index', indexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/venue", venueRoutes);
app.use("/api/pemesanan", pemesananRoutes);
app.use("/api/pembayaran", pembayaranRoutes);

//admin
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/verifikasi", verifikasiRoutes);

// ✅ Server listen
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
