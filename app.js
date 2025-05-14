const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;
const PASSWORD = "sub@6323030"; // 🔐 Change this to your secure password

// Serve files from the public folder
app.use(express.static("public"));
app.use(bodyParser.json());

// API: Load config
app.get("/config", (req, res) => {
  const filePath = path.join(__dirname, "config.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading config file.");
    res.json(JSON.parse(data));
  });
});

// API: Save config (requires password)
app.post("/config", (req, res) => {
  if (req.body.password !== PASSWORD) {
    return res.status(401).send("Unauthorized");
  }

  const filePath = path.join(__dirname, "config.json");
  fs.writeFile(filePath, JSON.stringify(req.body.config, null, 2), err => {
    if (err) return res.status(500).send("Failed to write config");
    res.send("Config updated successfully");
  });
});

// Optional: Clean routes for "/" and "/admin"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
