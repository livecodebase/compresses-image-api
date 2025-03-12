const multer = require("multer");
const path = require("path");
const { nanoid } = require('nanoid');
const fs = require('fs');

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
    // cb(null, uniqueId + "__" + file.originalname);
  },
});
const multerUploads = multer({ storage }).single("file");

module.exports = multerUploads;
