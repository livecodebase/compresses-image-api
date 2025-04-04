const fs = require("fs").promises;
const { compressWithTool, formatFileSize } = require('../util/common')
const sharp = require("sharp");

const pngCompressor = async ({
  filepath,
  filename,
  extention,
  host,
  mimetype,
  filesize,
  origin,
  outputPath,
}) => {
  await compressWithTool("pngquant", [
    `--quality=60-80`,
    filepath,
    "--output",
    outputPath,
  ]);
  // await compressWithTool("optipng",  ["-o7", outputPath]);

  // const imageBuffer = await fs.readFile(filepath);
  // await sharp(imageBuffer).png({ compressionLevel: 8 }).toFile(outputPath);
  // await compressWithTool("optipng",  ["-o7", "-out", outputPath, filepath,  ]);
  const originalSize = filesize;

  const minifiedSize = (await fs.stat(outputPath)).size;
  const minifiedSizeFormatted = formatFileSize(
    (await fs.stat(outputPath)).size
  );
  const compressionRatio = ((originalSize - minifiedSize) / originalSize) * 100;

  return {
    minified: `${origin}/uploads/${filename}-min${extention}`,
    originalSize,
    minifiedSize: minifiedSizeFormatted,
    compressionRatio: compressionRatio.toFixed(2) + "%",
  };
  
};

module.exports = pngCompressor;
