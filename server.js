const express = require("express");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 5000;

// In-memory request list for demo purposes
let maintenanceRequests = [];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// File upload storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const safeFileName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, safeFileName);
  }
});

// File validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and PDF files are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend health check passed",
    system: "Apartment Maintenance Request System"
  });
});

// Show new request form
app.get("/requests/new", (req, res) => {
  res.render("new-request", { error: null });
});

// Handle new maintenance request
app.post("/requests", upload.single("supportingFile"), (req, res) => {
  const { tenantName, apartmentNumber, category, description, urgency } = req.body;

  if (!tenantName || !apartmentNumber || !category || !description || !urgency) {
    return res.render("new-request", {
      error: "Please fill out all required fields."
    });
  }

  const newRequest = {
    id: maintenanceRequests.length + 1,
    tenantName,
    apartmentNumber,
    category,
    description,
    urgency,
    status: "Pending",
    fileName: req.file ? req.file.filename : "No file uploaded",
    createdAt: new Date().toLocaleString()
  };

  maintenanceRequests.push(newRequest);

  res.render("success", { request: newRequest });
});

// View all requests
app.get("/requests", (req, res) => {
  let requestRows = "";

  if (maintenanceRequests.length === 0) {
    requestRows = `
      <p>No maintenance requests have been submitted yet.</p>
    `;
  } else {
    requestRows = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tenant</th>
            <th>Apartment</th>
            <th>Category</th>
            <th>Urgency</th>
            <th>Status</th>
            <th>File</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${maintenanceRequests.map(request => `
            <tr>
              <td>${request.id}</td>
              <td>${request.tenantName}</td>
              <td>${request.apartmentNumber}</td>
              <td>${request.category}</td>
              <td>${request.urgency}</td>
              <td>${request.status}</td>
              <td>${request.fileName}</td>
              <td>${request.createdAt}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Maintenance Requests</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="container wide">
        <h1>Maintenance Requests</h1>

        ${requestRows}

        <div class="button-group">
          <a href="/requests/new" class="btn">Submit New Request</a>
          <a href="/" class="btn secondary">Back Home</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Update request status
app.post("/requests/:id/status", (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body;

  maintenanceRequests = maintenanceRequests.map((request) => {
    if (request.id === requestId) {
      return {
        ...request,
        status: status
      };
    }
    return request;
  });

  res.redirect("/requests");
});

// Error handler for file upload problems
app.use((err, req, res, next) => {
  if (err) {
    return res.render("new-request", {
      error: err.message
    });
  }

  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});