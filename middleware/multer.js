const multer = require("multer");
const path = require("path");
const { nanoid } = require('nanoid');
const fs = require('fs');

// Set file size limit (e.g., 5MB)
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

// Allowed file types
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueId = nanoid();
    cb(null, uniqueId + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only jpg, jpeg, and png are allowed."), false);
  }
};

const multerUploads = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter
}).single("file");

module.exports = multerUploads;