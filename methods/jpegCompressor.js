const fs = require("fs").promises;
const fileFs = require("fs");
const sharp = require("sharp");
const heicConvert = require("heic-convert");

const path = require("path");

const { Jimp } = require("jimp");
const { compressWithTool, formatFileSize } = require('../util/common')

const compressImage = async ({
  filepath,
  filename,
  extention,
  host,
  mimetype,
  filesize,
  origin,
  outputPath
}) => {
  try {

    const imageBuffer = await fs.readFile(filepath);
    const sharpImage = sharp(imageBuffer);

    const metrics = await analyzeImage(sharpImage);
    const quality = predictQuality(metrics);

    let compressQuality = quality;

    const originalSize = filesize;

    const handleFileConversion = async () => {
      await compressWithTool("mozjpeg", [`-quality`, compressQuality, "-outfile", outputPath, filepath]);
 
      const minifiedSize = (await fs.stat(outputPath)).size;
      const minifiedSizeFormatted = formatFileSize(
        (await fs.stat(outputPath)).size
      );
      const compressionRatio =
        ((originalSize - minifiedSize) / originalSize) * 100;

      if (compressionRatio < 0) {
        compressQuality = compressQuality + compressionRatio;
        handleFileConversion();
      }
      return { minifiedSizeFormatted, compressionRatio };
    };

    const { minifiedSizeFormatted, compressionRatio } = await handleFileConversion();

    return {
      minified: `${origin}/uploads/${filename}-min${extention}`,
      originalSize,
      minifiedSize: minifiedSizeFormatted,
      compressionRatio: compressionRatio.toFixed(2) + "%",
    };
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
};


function predictQuality({ avgBrightness, avgSaturation, contrast, entropy }) {
  let quality = 75; // Default quality

  if (entropy < 5.5) quality -= 10;
  if (contrast < 20) quality -= 5;
  if (avgBrightness > 200 || avgSaturation > 200) quality += 5;
  if (contrast > 50) quality += 10;
  if (entropy > 6.5) quality += 5;

  return Math.max(30, Math.min(quality, 95)); // Keep quality between 30-95
}
const analyzeImage = async (image) => {
  // Get brightness (existing)
  const brightnessData = await image
    .clone()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const avgBrightness =
    brightnessData.data.reduce((sum, v) => sum + v, 0) /
    (brightnessData.info.width * brightnessData.info.height);

  // Get saturation and contrast
  const { channels, stats } = await image
    .clone()
    .toColorspace("hsv")
    .greyscale()
    .stats()
    .then(({ channels, stats }) => ({ channels, stats }));


  const avgSaturation = channels[1].mean; // HSV saturation channel

  const { channels: grayChannels } = await image
    .clone()
    .greyscale() // Convert to grayscale first
    .stats(); // This returns { channels: [ { mean, stddev }, ... ] }

  const avgContrast =
    (grayChannels[0].stdev + grayChannels[1].stdev + grayChannels[2].stdev) / 3;

  // Get entropy
  const { entropy } = await image
    .clone()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data }) => {
      const histogram = new Array(256).fill(0);
      data.forEach((value) => histogram[value]++);
      const probabilities = histogram.map((count) => count / data.length);
      return {
        entropy: probabilities.reduce(
          (sum, p) => (p > 0 ? sum - p * Math.log2(p) : sum),
          0
        ),
      };
    });

  return { avgBrightness, avgSaturation, contrast: avgContrast, entropy };
};


module.exports = compressImage;
