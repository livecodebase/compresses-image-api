const express = require("express");
const port = 4000;

const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const path = require("path");
const cron = require("node-cron");

// Schedule a cron job to run every hour to delete files older than 1 hour
const directory = path.join(__dirname, "uploads");
console.log(directory);


cron.schedule("0 * * * *", async () => {
  const directory = path.join(__dirname, "../public");
  const files = await fs.readdir(directory);
  const now = Date.now();

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fs.stat(filePath);
    const fileAge = (now - stats.mtimeMs) / 1000; // file age in seconds

    if (fileAge > 3600) {
      // 1 hour
      try {
        await fs.unlink(filePath);
        // console.log(`Deleted old file: ${filePath}`);
      } catch (err) {
        // console.error(`Failed to delete file: ${filePath}`, err);
      }
    }
  }
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
// app.use(cors());

// Api routes
app.use("/api/compress/", require("./routes/compress"));

app.use("/", require("./pages"));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
