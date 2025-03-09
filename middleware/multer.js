const multer = require("multer");
const path = require("path");
const { nanoid } = require('nanoid');
const fs = require('fs');
const uniqueId = nanoid();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, uniqueId + path.extname(file.originalname));
    // cb(null, uniqueId + "__" + file.originalname);
  },
});
const multerTempUploads = multer({ storage }).single("file");

module.exports = multerTempUploads;
