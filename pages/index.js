const { Router } = require("express");
const router = Router();
const path = require("path");

router.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/home/index.html"));
});

module.exports = router;
