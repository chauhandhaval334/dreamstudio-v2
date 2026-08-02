require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const imageRoutes = require("./routes/image.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const adminRoutes = require("./routes/admin.routes");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Serve static assets for legacy file compatibility
const uploadFolder = process.env.UPLOAD_DIR || 'image';
const staticImageDir = path.isAbsolute(uploadFolder)
  ? uploadFolder
  : path.join(__dirname, '../', uploadFolder);

app.use('/image', express.static(staticImageDir));
app.use('/thumbnails', express.static(path.join(__dirname, '../thumbnails')));
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DreamStudio Backend V2 Running 🚀",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
});

// Register legacy Android API routes
app.use("/", imageRoutes);
app.use("/", subscriptionRoutes);
app.use("/", adminRoutes);

// Register centralized error middleware
app.use(errorMiddleware);

module.exports = app;
