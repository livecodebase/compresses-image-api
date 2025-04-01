const fs = require("fs").promises;
const fileFs = require('fs');
const sharp = require("sharp");
const heicConvert = require("heic-convert");

const path = require("path");
const { execa } = require('execa');
const { Jimp } = require('jimp');
const { log } = require("console");

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
  
   

    const imageBuffer = await fs.readFile(filepath);
    const sharpImage = sharp(imageBuffer);
    const {avgQuality, avgBrightness} = await comprsssionQualityEstimate(sharpImage);
    

    let compressQuality = 60;

    // console.log('compressQuality', compressQuality);
    
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

  const comprsssionQualityEstimate = async (image) => {
      const { data, info } = await image
            .clone()
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const totalBrightness = data.reduce((sum, value) => sum + value, 0);
        const avgBrightness = totalBrightness / (info.width * info.height);
        const brightnessPercentage = ((avgBrightness / 255) * 100).toFixed(2);
        
        console.log('brightnessPercentage', brightnessPercentage);

            
        // const smartQuality = getSmartQuality({avgQuality, avgBrightness});

        // console.log('smartQuality', smartQuality);
        
        // let compressQuality = avgBrightness > 100 ? Math.min(avgQuality, smartQuality) : Math.max(avgQuality, smartQuality)
        // // console.log('avgBrightness', avgBrightness);
        // const qualityDrop = estimateQualityDrop(filesize);
        // // console.log('compressQuality', compressQuality);
        // // let compressQualityNew = Math.max(10, compressQuality - qualityDrop);
        // compressQuality = Math.max(10, avgQuality - qualityDrop);


    // Determine quality based on brightness
    let avgQuality = 80;
    // if (avgBrightness > 220) {
    //   avgQuality = 20; // Ultra Low
    // } else if (avgBrightness > 180) {
    //   avgQuality = 40; // Low
    // } else if (avgBrightness > 120) {
    //   avgQuality = 60; // Normal
    // } else if (avgBrightness > 90) {
    //   avgQuality = 65; // High
    // } else if (avgBrightness > 60) {
    //   avgQuality = 70; // High
    // } else if (avgBrightness > 56) {
    //   avgQuality = 75; // High
    // } else {
    //   avgQuality = 80; // Very High
    // }
    // console.log('avgQuality', avgQuality);
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
