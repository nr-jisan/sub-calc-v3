const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;
const PASSWORD = "sub@6323030"; // 🔐 Admin panel & config password

// Serve static files
app.use(express.static("public"));
app.use(bodyParser.json());

// Middleware: HTTP Basic Auth for /admin
app.use("/admin", (req, res, next) => {
  const auth = { login: "admin", password: PASSWORD };

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login === auth.login && password === auth.password) {
    return next(); // Auth successful
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send("Authentication required.");
});

// Routes
app.get("/config", (req, res) => {
  const filePath = path.join(__dirname, "config.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading config file.");
    res.json(JSON.parse(data));
  });
});

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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
