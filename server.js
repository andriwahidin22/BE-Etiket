const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");

const adminRoutes = require("./routes/ruteAdmin"); // Pastikan path ini benar
const swaggerUi = require("./config/swagger").swaggerUi; // Import Swagger UI
const swaggerDocs = require("./config/swagger").swaggerDocs; // Import Swagger Docs

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());

app.use("/api/admin", adminRoutes); 
// handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs)); // Serve Swagger API docs

const PORT = process.env.PORT || 5002; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
