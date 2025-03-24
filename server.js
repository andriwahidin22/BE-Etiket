const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");

const adminRoutes = require("./routes/ruteAdmin"); // Pastikan path ini benar

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());

app.use("/api/admin", adminRoutes); // Harus ada ini

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
