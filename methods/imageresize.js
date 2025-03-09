const fs = require("fs").promises;
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminMozjpeg = require("imagemin-mozjpeg");
const path = require("path");
const { nanoid } = require("nanoid");

const funcs = {
  async universalResizer(filepath, size, host) {
    const id = nanoid();
    console.log('id', id);
    
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


module.exports = funcs;
