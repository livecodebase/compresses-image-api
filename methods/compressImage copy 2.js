const fs = require("fs").promises;
const fileFs = require("fs");
const sharp = require("sharp");
const heicConvert = require("heic-convert");

const path = require("path");
const { execa } = require("execa");
const { Jimp } = require("jimp");

const compressImage = async ({
  filepath,
  filename,
  extention,
  host,
  mimetype,
  filesize,
  origin,
}) => {
  try {
    const outputPath = path.join(
      __dirname,
      `../public/uploads/${filename}-min${extention}`
    );

    const outputFolder = path.join(__dirname, `../public/uploads`);
    if (!fileFs.existsSync(outputFolder)) {
      fileFs.mkdirSync(outputFolder, { recursive: true });
    }

    const imageBuffer = await fs.readFile(filepath);
    const sharpImage = sharp(imageBuffer);

    await comprsssionQualityEstimate(sharpImage);

    // const { avgQuality, avgBrightness } = await comprsssionQualityEstimate(
    //   sharpImage
    // );

    let compressQuality = 60;

    // console.log('compressQuality', compressQuality);

    if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
      // await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
      // await compressWithTool('jpegoptim', [`--size=${60}%`, '--strip-all', outputPath]);
      await compressWithTool("mozjpeg", [
        `-quality`,
        compressQuality,
        "-outfile",
        outputPath,
        filepath,
      ]);
    } else if (mimetype === "image/png") {
      await compressWithTool("pngquant", [
        `--quality=40-80`,
        filepath,
        "-o",
        outputPath,
      ]);
      // await compressWithTool('pngquant', [`-quality`, compressQuality, '-outfile', outputPath, filepath]);
    }

    const originalSize = filesize;
    const minifiedSize = (await fs.stat(outputPath)).size;
    const minifiedSizeFormatted = formatFileSize(
      (await fs.stat(outputPath)).size
    );
    const compressionRatio =
      ((originalSize - minifiedSize) / originalSize) * 100;

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

const compressWithTool = async (tool, args) => {
  try {
    await execa(tool, args);
  } catch (err) {
    console.error(`[ERROR] ${tool}:`, err.stderr || err.message);
    throw new Error(`Failed to compress image with ${tool}`);
  }
};

function formatFileSize(bytes, decimalPoint) {
  if (bytes == 0) return "0 Bytes";
  var k = 1000,
    dm = decimalPoint || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

const comprsssionQualityEstimate = async (image) => {
  // const { data, info } = await image
  const metrics = await analyzeImage(image);
  const quality = getSmartQuality(metrics);
  console.log('quality', quality);
};

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

    // console.log(channels);
    
  const avgSaturation = channels[1].mean; // HSV saturation channel


  const { channels: grayChannels } = await image
      .clone()
      .greyscale()  // Convert to grayscale first
      .stats();     // This returns { channels: [ { mean, stddev }, ... ] }

      const avgContrast = (
        grayChannels[0].stdev + 
        grayChannels[1].stdev + 
        grayChannels[2].stdev
      ) / 3;
  
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

const getSmartQuality = ({
  avgBrightness,
  avgSaturation,
  contrast,
  entropy,
}) => {
  const baseQuality = 80;

  // Weighted factors (adjust ratios based on testing)
  const brightnessWeight = 0.4;
  const saturationWeight = 0.3;
  const contrastWeight = contrast ? 0.2 : 0;
  const entropyWeight = entropy ? 0.1 : 0;

  // Normalize inputs (0–1)
  const normalized = {
    brightness: avgBrightness / 255,
    saturation: avgSaturation / 255,
    contrast: contrast ? contrast / 128 : 0, // Assuming max stddev ~128
    entropy: entropy ? entropy / 8 : 0, // Normalize by max 8-bit entropy
  };

  // Calculate composite score
  const score =
    normalized.brightness * brightnessWeight +
    normalized.saturation * saturationWeight +
    normalized.contrast * contrastWeight +
    normalized.entropy * entropyWeight;

  // Map score to quality range (65–90)
  const quality = baseQuality + Math.round(score * 25) - 10;
  return Math.max(65, Math.min(quality, 90));
};


module.exports = { compressImage };
