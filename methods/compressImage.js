const fileFs = require("fs");
const JpegCompressor = require("./jpegCompressor");
const pngCompressor = require("./pngCompressor");
const path = require("path");

const compressImage = async (imageData) => {
  const { filename, extention, mimetype, filesize, origin } = imageData;

  const outputPath = path.join(
    __dirname,
    `../public/uploads/${filename}-min${extention}`
  );

  const outputFolder = path.join(__dirname, `../public/uploads`);

  if (!fileFs.existsSync(outputFolder)) {
    fileFs.mkdirSync(outputFolder, { recursive: true });
  }

  if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
    return await JpegCompressor({...imageData, outputPath});
  } else if (mimetype === "image/png") {
    return await pngCompressor({...imageData, outputPath});
  }
  throw new Error("Failed to compress image"); 
};
module.exports = { compressImage };
