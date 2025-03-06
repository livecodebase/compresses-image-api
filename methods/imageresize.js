const fs = require("fs").promises;
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminMozjpeg = require("imagemin-mozjpeg");
const path = require("path");
const { nanoid } = require("nanoid");
const cron = require("node-cron");

const funcs = {
  async universalResizer(filepath, size, host) {
    const id = nanoid();
    try {
      const imageBuffer = await fs.readFile(filepath);
      const format = req.query.format || "jpeg"; // Default to JPEG

      // let image = sharp(data).rotate();
      // if (size) {
      //   image = image.resize(size);
      // }

      // const mindata = await image.toBuffer();
      // const files = await imagemin.buffer(mindata, {
      //   plugins: [
      //     imageminMozjpeg({ quality: 80 }),
      //     imageminPngquant({ quality: [0.7, 0.8] }),
      //   ],
      // });
      const originalExt = path.extname(req.file.originalname).toLowerCase();

      // Convert HEIC to JPG
      if (originalExt === ".heic" || originalExt === ".heif") {
        imageBuffer = await heicConvert({
          buffer: req.file.buffer,
          format: "JPEG",
          quality: 1, // Lossless quality
        });
      }

      let image = sharp(imageBuffer);

      if (format === "jpeg" || format === "jpg") {
        image = image.jpeg({ quality: 100 }); // Lossless JPEG
      } else if (format === "png") {
        image = image.png({ compressionLevel: 9 });
      } else {
        return res.status(400).json({ error: "Unsupported format" });
      }

      const outputPath = path.join(__dirname, `../public/${id}.${format}`);
      // await fs.writeFile(outputPath, files);
      await image.toFile(outputPath);

      return `http://${host}/${id}.jpeg`;
    } catch (err) {
      // console.error(err);
      throw err;
    }
  },
};

// Schedule a cron job to run every hour to delete files older than 1 hour
cron.schedule("0 * * * *", async () => {
  const directory = path.join(__dirname, "../public");
  const files = await fs.readdir(directory);
  const now = Date.now();

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fs.stat(filePath);
    const fileAge = (now - stats.mtimeMs) / 1000; // file age in seconds

    if (fileAge > 3600) {
      // 1 hour
      try {
        await fs.unlink(filePath);
        // console.log(`Deleted old file: ${filePath}`);
      } catch (err) {
        // console.error(`Failed to delete file: ${filePath}`, err);
      }
    }
  }
});

module.exports = funcs;
