const express = require("express");
const flightsRoutes = require("./flights.routes");
const alertsRoutes = require("./alerts.routes");

const router = express.Router();

// Mount route modules
router.use("/flights", flightsRoutes);
router.use("/alerts", alertsRoutes);

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Flight Tracker Backend API",
    version: "1.0.0",
  });
});

module.exports = router;
