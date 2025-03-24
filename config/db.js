const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root", 
    password: "", 
    database: "db_etiket" 
});

db.connect((err) => {
    if (err) {
        console.error("❌ Gagal terhubung ke database:", err);
        return;
    }
    console.log("✅ Database terhubung dengan sukses!");
});

module.exports = db;
