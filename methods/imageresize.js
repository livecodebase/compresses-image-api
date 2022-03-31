const fs = require("fs");
const shortid = require("shortid");
const sharp = require("sharp");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminMozjpeg = require("imagemin-mozjpeg");

const funcs = {
  universalResizer(filepath, size, host) {
    const id = shortid.generate();
    return new Promise(function (resolve, reject) {
      return fs.readFile(filepath, (err, data) => {
        sharp(data)
          .rotate()
          // .resize(size)
          .toBuffer()
          .then((mindata) => {
            (async () => {
              try {
                const files = await imagemin.buffer(mindata, {
                  destination: "public",
                  plugins: [
                    imageminMozjpeg({ quality: 80 }),
                    imageminPngquant({
                      quality: [0.7, 0.8],
                    }),
                  ],
                });
                fs.writeFile(`public/${id}.jpeg`, files, function (err) {
                  if (err) {
                    throw err;
                  }
                  setTimeout(() => {
                    fs.unlink(`public/${id}.jpeg`, function (err) {
                      if (err) throw err;
                    });
                  }, 100000);
                  resolve(`http://${host}/${id}.jpeg`);
                });
              } catch (error) {
                return error;
              }
            })();
          })
          .catch((err) => {
            console.log(err);
          });
      });
    });
  },
  size_10(image) {
    return image;
  },
  size_50() {},
  size_100() {},
};

module.exports = funcs;
