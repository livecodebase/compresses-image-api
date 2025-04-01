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

    const metrics = await analyzeImage(sharpImage);
    const avgQuality = predictQuality(metrics);

    // console.log('aiquality', quality);

    // // const {avgQuality, avgBrightness} = await comprsssionQualityEstimate(sharpImage);

    let compressQuality = Math.max(avgQuality, smartQuality)
    
    // if (avgBrightness > 80) {
      
    // }

    // let compressQuality = avgBrightness > 120 ? Math.min(avgQuality, smartQuality) : Math.max(avgQuality, smartQuality)
    // console.log('avgBrightness', avgBrightness);
    // console.log('compressQuality', compressQuality);
    // let compressQualityNew = Math.max(10, compressQuality - qualityDrop);
    
    const qualityDrop = estimateQualityDrop(filesize);
    compressQuality = Math.max(10, avgQuality - qualityDrop);


    // console.log('avgQuality', avgQuality);
    // console.log('smartQuality', smartQuality);
    console.log('compressQuality', compressQuality);

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

function predictQuality({ avgBrightness, avgSaturation, contrast, entropy }) {
  let quality = 75; // Default quality
  
  if (entropy < 5.5) quality -= 10;
  if (contrast < 20) quality -= 5;
  if (avgBrightness > 200 || avgSaturation > 200) quality += 5;
  if (contrast > 50) quality += 10;
  if (entropy > 6.5) quality += 5;
  
  return Math.max(30, Math.min(quality, 95)); // Keep quality between 30-95
}

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
    const imagedata = await image
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: false });
  
    const avgBrightness = imagedata.reduce((sum, val) => sum + val, 0) / imagedata.length;
    const brightnessPercentage = ((avgBrightness / 255) * 100).toFixed(2);

    console.log("---------");
    
    console.log('brightnessPercentage', brightnessPercentage);

    const metrics = await analyzeImage(image);
    
    const quality = predictQuality(metrics);
    console.log('aiquality', quality);
    
    
    // Determine quality based on brightness
    // const avgQuality = () => {
      
    //   return 100 - brightnessPercentage < 20 ? 20
    // };

    // let avgQuality = Math.round(100 - brightnessPercentage);
    // switch (avgQuality) {
    //   case avgQuality > 90:
    //       avgQuality = 90
    //     break;
    //   case avgQuality < 20:
    //       avgQuality = 20
    //     break;
    // }

    let avgQuality;
    // if (brightnessPercentage > 90) {
    //   avgQuality = 20; // Ultra Low
    // } else if (brightnessPercentage > 70) {
    //   avgQuality = 40; // Low
    // } else if (brightnessPercentage > 50) {
    //   avgQuality = 60; // Normal
    // } else if (brightnessPercentage > 40) {
    //   avgQuality = 70; // High
    // } else if (brightnessPercentage > 38) {
    //   avgQuality = 75; // High
    // } else if (brightnessPercentage > 36) {
    //   avgQuality = 80; // High
    // } else if (brightnessPercentage > 34) {
    //   avgQuality = 85; // High
    // } else {
    //   avgQuality = 90; // Very High
    // }
    if (brightnessPercentage > 90) {
      avgQuality = 20; // Ultra Low
    } else if (brightnessPercentage > 70) {
      avgQuality = 40; // Low
    } else if (brightnessPercentage > 50) {
      avgQuality = 60; // Normal
    } else if (brightnessPercentage > 30) {
      avgQuality = 70; // High
    } else {
      avgQuality = 80;
    }
    return {avgQuality, avgBrightness};
  };

  function estimateQualityDrop(filesize) {
    // Define thresholds and corresponding quality drops
    const thresholds = [
      { size: 5 * 1024 * 1024, drop: 10 }, // > 5MB
      { size: 2 * 1024 * 1024, drop: 5 },  // > 2MB
      { size: 1 * 1024 * 1024, drop: 3 },  // > 1MB
      // { size: 500 * 1024, drop: 2 },       // > 500KB
      { size: 0, drop: 0 },       // > 500KB
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
  
module.exports = { compressImage };
