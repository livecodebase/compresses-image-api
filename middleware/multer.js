const multer = require("multer");
const path = require("path");
const { nanoid } = require('nanoid');
const uniqueId = nanoid();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, uniqueId + path.extname(file.originalname));
  },
});
const multerTempUploads = multer({ storage }).single("file");

module.exports = multerTempUploads;
