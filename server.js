const express = require("express");

const app = express();
const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Apartment Maintenance Request System is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend health check passed",
    system: "Apartment Maintenance Request System"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});