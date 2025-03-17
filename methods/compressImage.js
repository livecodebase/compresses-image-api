const fs = require("fs").promises;
const fileFs = require('fs');
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
  origin
}) => {
  try {
    const outputPath = path.join(
      __dirname,
      `../public/uploads/${filename}-min${extention}`
    );
  
    const outputFolder = path.join(__dirname, `../public/uploads`)
    if (!fileFs.existsSync(outputFolder)) {
      fileFs.mkdirSync(outputFolder, { recursive: true });
    }
  
    const stats = await analyzeImageStats(filepath);
    const smartQuality = getSmartQuality(stats);

    const imageBuffer = await fs.readFile(filepath);
    const sharpImage = sharp(imageBuffer);
    const {avgQuality, avgBrightness} = await comprsssionQualityEstimate(sharpImage);
    // console.log('avgQuality', avgQuality);

    let compressQuality = avgBrightness > 120 ? Math.min(avgQuality, smartQuality) : Math.max(avgQuality, smartQuality)
    // console.log('avgBrightness', avgBrightness);
    const qualityDrop = estimateQualityDrop(filesize);
    // console.log('compressQuality', compressQuality);
    // let compressQualityNew = Math.max(10, compressQuality - qualityDrop);
    compressQuality = Math.max(10, avgQuality - qualityDrop);

    // console.log('smartQuality', smartQuality);
    // console.log('avgQuality', avgQuality);
    // console.log('compressQuality', compressQuality);
    // console.log('compressQualityNew', compressQualityNew);
    // console.log('----');
  
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      // await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
      // await compressWithTool('jpegoptim', [`--size=${60}%`, '--strip-all', outputPath]);
      await compressWithTool('mozjpeg', [`-quality`, compressQuality, '-outfile', outputPath, filepath]);
    } else if(mimetype === 'image/png') {
      await compressWithTool('pngquant', [`--quality=40-80`, filepath, '-o', outputPath]);
      // await compressWithTool('pngquant', [`-quality`, compressQuality, '-outfile', outputPath, filepath]);
    }
  
    const originalSize = filesize;
    const minifiedSize = (await fs.stat(outputPath)).size;
    const minifiedSizeFormatted = formatFileSize((await fs.stat(outputPath)).size);
    const compressionRatio = ((originalSize - minifiedSize) / originalSize) * 100;
  
    return {
      minified: `${origin}/uploads/${filename}-min${extention}`,
      originalSize,
      minifiedSize: minifiedSizeFormatted,
      compressionRatio: compressionRatio.toFixed(2) + '%',
    }; 
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
};
 
const compressWithTool = async (tool, args) => {
  try {
    await execa(tool, args);
  } catch (err) {
    console.error(`[ERROR] ${tool}:`, err.stderr || err.message);
    throw new Error(`Failed to compress image with ${tool}`);
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
    
    // console.log('getSmartQuality base:', quality);
    // console.log('getSmartQuality math:', Math.max(65, Math.min(quality, baseQuality)));
    
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

  const comprsssionQualityEstimate = async (image) => {
    const data = await image
      .clone()
      .resize(10, 10)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: false });
  
    const avgBrightness = data.reduce((sum, val) => sum + val, 0) / data.length;
    // console.log("avgBrightness", avgBrightness);
    
    // Determine quality based on brightness
    let avgQuality;
    if (avgBrightness > 220) {
      avgQuality = 20; // Ultra Low
    } else if (avgBrightness > 180) {
      avgQuality = 40; // Low
    } else if (avgBrightness > 120) {
      avgQuality = 60; // Normal
    } else if (avgBrightness > 60) {
      avgQuality = 70; // High
    } else if (avgBrightness > 56) {
      avgQuality = 75; // High
    } else {
      avgQuality = 80; // Very High
    }
    return {avgQuality, avgBrightness};
  };

  function estimateQualityDrop(filesize) {
    // Define thresholds and corresponding quality drops
    const thresholds = [
      { size: 5 * 1024 * 1024, drop: 10 }, // > 5MB
      { size: 2 * 1024 * 1024, drop: 5 },  // > 2MB
      { size: 1 * 1024 * 1024, drop: 3 },  // > 1MB
      { size: 500 * 1024, drop: 2 },       // > 500KB
    ];

    // Determine the quality drop based on file size
    for (const threshold of thresholds) {
      if (filesize > threshold.size) {
        return threshold.drop;
      }
    }
    // Default drop for smaller files
    return 0;
  }

module.exports = { compressImage };
