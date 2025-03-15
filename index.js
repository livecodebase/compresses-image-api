const express = require("express");
const port = 4000;

const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const fs = require("fs/promises");
const path = require("path");
const cron = require("node-cron");

// cron.schedule('0 * * * *', () => {
cron.schedule("* * * * *", () => {
  const directory = path.join(__dirname, "public/uploads");
  const now = Date.now();
  fs.readdir(directory).then(async (files) => {
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      const fileAge = (now - stats.mtimeMs) / 1000;
      if (fileAge > 3600) {
        try {
          await fs.unlink(filePath);
          console.log(`Deleted old file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete file: ${filePath}`, err);
        }
      }
    }
  });
});

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

// body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
// app.use(cors());

const allowedOrigin = "https://compresso.livecodebase.com";
// const allowedOrigin = "http://localhost:4000";

app.use(
  cors({
    origin: allowedOrigin,
    // credentials: true, // only if you're using cookies or auth headers
  })
);

// app.use(require('express-status-monitor')());

app.use("/api/compress/", require("./routes/compress"));

// app.use("/", require("./pages"));
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => console.log(`Example app listening at PORT ${port}`));
