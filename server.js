const express = require("express");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 5000;

// Temporary in-memory storage for demo purposes
let maintenanceRequests = [];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// File upload storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const safeFileName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
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
    fileSize: 5 * 1024 * 1024
  }
});

// Helper function for status color
function getStatusClass(status) {
  if (status === "Completed") return "status completed";
  if (status === "In Progress") return "status progress";
  if (status === "Failed") return "status failed";
  return "status pending";
}

// Helper function for urgency color
function getUrgencyClass(urgency) {
  if (urgency === "Emergency") return "urgency emergency";
  if (urgency === "High") return "urgency high";
  if (urgency === "Medium") return "urgency medium";
  return "urgency low";
}

// Home page
app.get("/", (req, res) => {
  res.render("index", {
    requestCount: maintenanceRequests.length
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend health check passed",
    system: "Apartment Maintenance Request System",
    totalRequests: maintenanceRequests.length
  });
});

// New request form
app.get("/requests/new", (req, res) => {
  res.render("new-request", { error: null });
});

// Submit request
app.post("/requests", upload.single("supportingFile"), (req, res) => {
  const { tenantName, apartmentNumber, category, description, urgency } = req.body;

  if (!tenantName || !apartmentNumber || !category || !description || !urgency) {
    return res.render("new-request", {
      error: "Please fill out all required fields before submitting."
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

// Polished requests page using direct HTML
app.get("/requests", (req, res) => {
  let content = "";

  if (maintenanceRequests.length === 0) {
    content = `
      <div class="empty-state">
        <div class="empty-icon">🛠️</div>
        <h2>No Requests Yet</h2>
        <p>No maintenance requests have been submitted yet. Create a new request to begin tracking maintenance issues.</p>
        <a href="/requests/new" class="btn">Submit First Request</a>
      </div>
    `;
  } else {
    content = `
      <div class="table-wrapper">
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
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            ${maintenanceRequests.map(request => `
              <tr>
                <td>#${request.id}</td>
                <td>
                  <strong>${request.tenantName}</strong>
                  <small>${request.description}</small>
                </td>
                <td>${request.apartmentNumber}</td>
                <td>${request.category}</td>
                <td><span class="${getUrgencyClass(request.urgency)}">${request.urgency}</span></td>
                <td><span class="${getStatusClass(request.status)}">${request.status}</span></td>
                <td>${request.fileName}</td>
                <td>${request.createdAt}</td>
                <td>
                  <form action="/requests/${request.id}/status" method="POST" class="status-form">
                    <select name="status">
                      <option value="Pending" ${request.status === "Pending" ? "selected" : ""}>Pending</option>
                      <option value="In Progress" ${request.status === "In Progress" ? "selected" : ""}>In Progress</option>
                      <option value="Completed" ${request.status === "Completed" ? "selected" : ""}>Completed</option>
                      <option value="Failed" ${request.status === "Failed" ? "selected" : ""}>Failed</option>
                    </select>
                    <button type="submit" class="small-btn">Save</button>
                  </form>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Maintenance Requests</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <nav class="navbar">
        <div class="nav-brand">🏢 Apartment Maintenance</div>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/requests/new">Submit Request</a>
          <a href="/requests">Requests</a>
          <a href="/health">Health</a>
        </div>
      </nav>

      <main class="page">
        <section class="page-header">
          <p class="eyebrow">Request Tracking</p>
          <h1>Maintenance Requests</h1>
          <p>View submitted maintenance requests and update their current status.</p>
        </section>

        <section class="card">
          <div class="card-header-row">
            <div>
              <h2>Request Dashboard</h2>
              <p>${maintenanceRequests.length} total request(s) submitted</p>
            </div>
            <a href="/requests/new" class="btn">+ New Request</a>
          </div>

          ${content}
        </section>
      </main>

      <footer class="footer">
        <p>Apartment Maintenance Request System • Software Engineering Final Project</p>
      </footer>
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
        status
      };
    }
    return request;
  });

  res.redirect("/requests");
});

// Error handler
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