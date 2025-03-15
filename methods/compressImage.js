const fs = require("fs").promises;
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const path = require("path");
const { execa } = require('execa');
const { Jimp } = require('jimp');

const compressImage = async ({
  filepath,
  filename,
  extention,
  host,
  mimetype,
  filesize,
}) => {
  const outputPath = path.join(
    __dirname,
    `../uploads/${filename}-min${extention}`
  );

  const stats = await analyzeImageStats(filepath);
  const smartQuality = getSmartQuality(stats);

  await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
  await compressWithTool('jpegoptim', [`--size=${smartQuality}%`, '--strip-all', outputPath]);

  const originalSize = filesize;
  const minifiedSize = (await fs.stat(outputPath)).size;
  const minifiedSizeFormatted = formatFileSize((await fs.stat(outputPath)).size);
  const compressionRatio = ((originalSize - minifiedSize) / originalSize) * 100;

  return {
    minified: `http://${host}/${filename}-min${extention}`,
    originalSize,
    minifiedSize: minifiedSizeFormatted,
    compressionRatio: compressionRatio.toFixed(2) + '%',
  };
};
 
const compressWithTool = async (tool, args) => {
  try {
    await execa(tool, args);
  } catch (err) {
    console.error(`[ERROR] ${tool}:`, err.stderr || err.message);
  }
};

async function analyzeImageStats(imagePath) {
    const image = await Jimp.read(imagePath);
    const { bitmap } = image;
    const { data, width, height } = bitmap;
  
    let totalBrightness = 0;
    let totalSaturation = 0;
    let pixelCount = width * height;
  
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
  
      // Saturation estimation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      totalSaturation += (max === 0) ? 0 : (max - min) / max * 100;
    }
  
    const avgBrightness = totalBrightness / pixelCount;
    const avgSaturation = totalSaturation / pixelCount;
  
    return { avgBrightness, avgSaturation };
  }
  
  function getSmartQuality({ avgBrightness, avgSaturation }) {
    // Adjust quality based on file size
    const baseQuality = 80;
    // Bright image + low saturation = compress more
    const weight = (avgBrightness * 0.6 + avgSaturation * 0.4) / 255;
    const quality = baseQuality - Math.floor(weight * 20); // range 70–90
    
    return Math.max(65, Math.min(quality, baseQuality));
  }

  function formatFileSize(bytes, decimalPoint) {
    if (bytes == 0) return "0 Bytes";
    var k = 1000,
      dm = decimalPoint || 2,
      sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

module.exports = { compressImage };
