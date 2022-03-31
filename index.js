const express = require("express");
const port = 4000;

const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

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
app.use(cors());

// Api routes
app.use("/api/compress/", require("./routes/compress"));

app.use("/", require("./pages"));

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
