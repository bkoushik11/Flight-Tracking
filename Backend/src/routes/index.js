const express = require("express");
const flightsRoutes = require("./flights.routes");
const authRoutes = require("./auth");
const recordingsRoutes = require("./recordings.routes");

const router = express.Router();

// Mount route modules
router.use("/flights", flightsRoutes);
router.use("/auth", authRoutes);
router.use("/recordings", recordingsRoutes);

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Flight Tracker Backend API",
    version: "1.0.0",
  });
});

module.exports = router;
