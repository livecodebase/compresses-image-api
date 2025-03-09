const { Router } = require("express");
const router = Router();
const multerUploads = require("../../middleware/multer");

const funcs = require("../../methods/imageresize");
const fs = require("fs");

router.post("/image", multerUploads, async (req, res) => {
  return res.status(200).send({hi:"sdfsdf"})

  // if (!req.file) {
  //   return res.status(400).json({ error: "No file attached" });
  // }
  // const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  // if (!allowedTypes.includes(req.file.mimetype)) {
  //   return res.status(400).json({ error: "Invalid file type. Only jpg, jpeg, and png are allowed." });
  // }
  // let size = 500;

  // let data = await funcs.universalResizer(
  //   req.file.path,
  //   size,
  //   req.headers.host
  // );
  // console.log('data', data);
  
  // fs.unlink(req.file.path, function (err) {
  //   if (err) throw err;
  // });
  // res.send(data);
});

/* router.post("/video", multerUploads.single("file"), (req, res) => {
  try {
    new ffmpeg(req.file.path, function (err, video) {
      video
        .setVideoBitRate(1000)
        .setAudioBitRate(128)
        .save("build/your_movie.avi", function (error, file) {
          console.log(file);
        });
    });
  } catch (e) {}
});
 */
/* router.post("/image/base64", (req, res) => {
  let base64String = req.body.image;
  let base64Image = base64String.split(";base64,").pop();
  let id = Date.now();
  fs.writeFile(
    `uploads/${id}.jpeg`,
    base64Image,
    { encoding: "base64" },
    function (err) {
      if (err) throw err;

      (async () => {
        try {
          const files = await imagemin([`uploads/${id}.jpeg`], {
            destination: "public/images",
            plugins: [
              imageminJpegtran(),
              imageminPngquant({
                quality: [0.5, 0.8],
              }),
            ],
          });
          fs.unlink(`uploads/${id}.jpeg`, function (err) {
            if (err) throw err;
            res.send(files);
          });
        } catch (error) {
          console.log(error);
          res.send(error);
        }
      })();
    }
  );
}); */

module.exports = router;
