const { Router } = require("express");
const router = Router();
const multerUploads = require("../../middleware/multer");
const { compressImage } = require("../../methods/compressImage");
const fs = require("fs");
const path = require("path");

router.post("/image", multerUploads, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file attached" });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Only jpg, jpeg, and png are allowed." });
    }
    
    let imageData = {
      filepath: req.file.path,
      filename: req.file.filename.split('.')?.[0],
      extention: path.extname(req.file.filename).toLowerCase(),
      filesize: req.file.size,
      host: req.headers.host,
      mimetype: req.file.mimetype || "image/jpeg",
      origin: req.headers.origin || process.env.ALLOWED_ORIGIN
    };

    const modifiedData = await compressImage(imageData);

    fs.unlink(req.file.path, function (err) {
      if (err) {
        console.error(`Failed to delete file: ${req.file.path}`, err);
      }
    });

    if (!modifiedData) {
      res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(modifiedData);
  } catch (error) {
    console.error("Error processing image upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
