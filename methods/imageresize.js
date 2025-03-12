const fs = require("fs").promises;
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminMozjpeg = require("imagemin-mozjpeg");
const path = require("path");
const { execa } = require('execa');
// const { nanoid } = require("nanoid");

const funcs = {
  async universalResizer({
    filepath,
    filename,
    extention,
    host,
    mimetype,
    filesize
  }) {
    // const id = nanoid();
    try {
      const imageBuffer = await fs.readFile(filepath);
      const fileMimetype = mimetype || "image/jpeg"; // Default to JPEG
      console.log("fileMimetype", fileMimetype);

      // let fileBuffer = fs.readFile(filepath)
      // let image1 = sharp(imageBuffer).rotate();
      // if (size) {
      //   image = image.resize(size);
      // }
      // const mindata = await image1.toBuffer();
      // const files = await imagemin.buffer(mindata, {
      //   plugins: [
      //     imageminMozjpeg({ quality: 80 }),
      //     imageminPngquant({ quality: [0.7, 0.8] }),
      //   ],
      // });
      // const outputPath = path.join(__dirname, `../uploads/${filename}-min${extention}`);
      // await fs.writeFile(outputPath, files);
      // return `http://${host}/${filename}-min${extention}`;

      // Convert HEIC to JPG
      if (extention === ".heic" || extention === ".heif") {
        imageBuffer = await heicConvert({
          buffer: req.file.buffer,
          format: "JPEG",
          quality: 1, // Lossless quality
        });
      }

      let image = sharp(imageBuffer);
      const outputPath = path.join(
        __dirname,
        `../uploads/${filename}-min${extention}`
      );

      const checkJpegQuality = await comprsssionQualityEstimate(image);
      if (fileMimetype === "image/jpeg" || fileMimetype === "image/jpg") {
        console.log(checkJpegQuality);
        image = image.jpeg({ quality: checkJpegQuality, mozjpeg: true, progressive: true }); // chromaSubsampling: '4:4:4'
        
        // if (checkJpegQuality < 70) {
        //   image = image.jpeg({ quality: checkJpegQuality, mozjpeg: true, progressive: true }); // chromaSubsampling: '4:4:4'
        // } else {
        //   await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
        //   await compressWithTool('jpegoptim', ['--max=70', '--strip-all', outputPath]);
        // }

      } else if (fileMimetype === "image/png") {
        image = image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true });
      } else if (fileMimetype === "image/webp") {
        image = image.webp({ quality: 75, nearLossless: true, smartSubsample: true });
      } else {
        throw "Unsupported format";
      }

      
      // await fs.writeFile(outputPath, files);
      const newFileRef = await image.toFile(outputPath);
      const newFileSize = newFileRef.size
      // await compareFileSizes(newFileSize, filesize, checkJpegQuality, image, outputPath);
      return {
        minified: `http://${host}/${filename}-min${extention}`,
      };
    } catch (err) {
      // console.error(err);
      throw err;
    }
  },
};

const comprsssionQualityEstimate = async (image) => {
  const data = await image
    .clone()
    .resize(10, 10)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: false });

  const avgBrightness = data.reduce((sum, val) => sum + val, 0) / data.length;
  // Determine quality based on brightness
  let quality;
  console.log('avgBrightness', avgBrightness);
  
  if (avgBrightness > 220) {
    quality = 20; // Ultra Low
  } else if (avgBrightness > 180) {
    quality = 40; // Low
  } else if (avgBrightness > 120) {
    quality = 60; // Normal
  } else if (avgBrightness > 60) {
    quality = 70; // High
  } else if (avgBrightness > 56) {
    quality = 70; // High
  } else {
    quality = 80; // Very High
  }
  return quality;
};

const compressWithRetry = async (currentQuality, imageRef, outputPath, filesize) => {
  const updatedQuality = currentQuality - 5;
  let image = imageRef.jpeg({ quality: updatedQuality, mozjpeg: true });
  const newFileRef = await image.toFile(outputPath);
  const newFileSize = newFileRef.size
  await compareFileSizes(newFileSize, filesize, updatedQuality, image);
}

const compareFileSizes = async (newFileSize, filesize, quality, imageRef, outputPath) => {
  if (newFileSize > filesize) {
    await compressWithRetry(quality, imageRef, outputPath, filesize);
    console.log("recompression");
    return
  }
}

const compressWithTool = async (tool, args) => {
  try {
    await execa(tool, args);
  } catch (err) {
    console.error(`[ERROR] ${tool}:`, err.stderr || err.message);
  }
};

const compressImage = () => {
  
}

module.exports = funcs;
