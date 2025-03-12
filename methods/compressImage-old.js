const fs = require("fs").promises;
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const path = require("path");
const { execa } = require('execa');
const { Jimp } = require("jimp");

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
  console.log(filepath);
  
  let imageBuffer = await fs.readFile(filepath);

  // Convert HEIC to JPG
  if (extention === ".heic" || extention === ".heif") {
    imageBuffer = await heicConvert({
      buffer: req.file.buffer,
      format: "JPEG",
      quality: 1, // Lossless quality
    });
  }
  let sharpImage = sharp(imageBuffer);
//   const checkJpegQuality = await comprsssionQualityEstimate(sharpImage);
//   console.log(checkJpegQuality);
console.log("----------------");
const stats1 = await analyzeImageStats(filepath);
  const quality1 = getSmartQuality(stats1);

  console.log(`🔍 Brightness: ${stats1.avgBrightness.toFixed(2)}, Saturation: ${stats1.avgSaturation.toFixed(2)}`);
  console.log(`📦 Auto quality selected: ${quality1}`);
console.log("----------------");



  // const recommendedQuality = await getAutoJPEGQuality(filepath);
  // console.log('Recommended Quality:', recommendedQuality);
  const recommendedQuality = quality1

  let minifiedImage;
    //   minifiedImage = sharpImage.jpeg({ quality: checkJpegQuality, mozjpeg: true, progressive: true });

     // chromaSubsampling: '4:4:4'
    await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
    await compressWithTool('jpegoptim', [`--max=${recommendedQuality}`, '--strip-all', outputPath]);

    //   if (checkJpegQuality > 70) {
    //     minifiedImage = image.jpeg({ quality: 70, mozjpeg: true, progressive: true }); // chromaSubsampling: '4:4:4'
    //   } else {
    //     await compressWithTool('jpegtran', ['-copy', 'none', '-optimize', '-progressive', '-outfile', outputPath, filepath]);
    //     await compressWithTool('jpegoptim', ['--max=70', '--strip-all', outputPath]);
    //   }

    // const outputPathSecond = path.join(
    //     __dirname,
    //     `../uploads/${filename}-min-two-${extention}`
    // );
    // minifiedImage = sharpImage.jpeg({ quality: recommendedQuality });
    // await minifiedImage.toFile(outputPathSecond);
  
//   const newFileRef = await minifiedImage.toFile(outputPath);
//   const newFileSize = newFileRef.size

  return {
    minified: `http://${host}/${filename}-min${extention}`,
  };
};

async function getAutoJPEGQuality(imagePath) {
    const { data, info } = await sharp(imagePath)
      .resize(100, 100, { fit: "inside" }) // downsample for speed
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  
    let totalBrightness = 0;
  
    for (let i = 0; i < data.length; i += 3) {
      // Get R, G, B
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Convert to brightness (simple avg)
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
    }
  
    const pixelCount = info.width * info.height;
    const avgBrightness = totalBrightness / pixelCount;
    console.log("avgBrightness 2", avgBrightness);
    // Scale quality based on brightness
    const avgQuality = mapBrightnessToQuality(avgBrightness);
    return avgQuality
    // console.log("avgQuality 2", avgQuality);
    // let quality;
    // if (avgBrightness > 220) {
    //     quality = 20; // Ultra Low
    // } else if (avgBrightness > 180) {
    //     quality = 40; // Low
    // } else if (avgBrightness > 120) {
    //     quality = 60; // Normal
    // } else if (avgBrightness > 60) {
    //     quality = 65; // High
    // } else if (avgBrightness > 56) {
    //     quality = 70; // High
    // } else {
    //     quality = 75; // Very High
    // }
    // return quality;
}

function mapBrightnessToQuality(avgBrightness) {
    // Brightness range: 0 (dark) to 255 (bright)
    // We want quality: 90 (dark) to 70 (bright)
    const minQuality = 20;
    const maxQuality = 80;
  
    const brightnessClamped = Math.max(0, Math.min(255, avgBrightness));
    const quality = maxQuality - ((brightnessClamped / 255) * (maxQuality - minQuality));
  
    return Math.round(quality);
}

const comprsssionQualityEstimate = async (image) => {
  const data = await image
    .clone()
    .resize(10, 10)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: false });

  const avgBrightness = data.reduce((sum, val) => sum + val, 0) / data.length;
  console.log("avgBrightness", avgBrightness);
  
  // Determine quality based on brightness
  let quality;
  if (avgBrightness > 220) {
    quality = 20; // Ultra Low
  } else if (avgBrightness > 180) {
    quality = 40; // Low
  } else if (avgBrightness > 120) {
    quality = 60; // Normal
  } else if (avgBrightness > 60) {
    quality = 70; // High
  } else if (avgBrightness > 56) {
    quality = 75; // High
  } else {
    quality = 80; // Very High
  }
  return quality;
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
    // Bright image + low saturation = compress more
    const weight = (avgBrightness * 0.6 + avgSaturation * 0.4) / 255;
    const quality = 90 - Math.floor(weight * 20); // range 70–90
    return Math.max(65, Math.min(quality, 90));
  }

module.exports = { compressImage };
