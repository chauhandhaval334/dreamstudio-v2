require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "DreamStudio Backend V2 Running 🚀",
        version: "2.0.0",
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
