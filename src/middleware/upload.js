//src/middleware/upload.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Konfigurasi tempat penyimpanan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/";

    // Buat folder jika belum ada
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  }
});

// Filter jenis file (hanya gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("File harus berupa gambar!"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
