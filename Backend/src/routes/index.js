const express = require("express");
const healthRoutes = require("./health.routes");
const flightsRoutes = require("./flights.routes");
const simulatorRoutes = require("./simulator.routes");

const router = express.Router();

// Mount route modules
router.use("/health", healthRoutes);
router.use("/flights", flightsRoutes);
router.use("/simulator", simulatorRoutes);

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Flight Tracker Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      flights: "/flights",
      flightsCount: "/flights/count",
      flightsReset: "/flights/reset",
      flightsSeed: "/flights/seed",
      simulatorStatus: "/simulator/status",
      simulatorPause: "/simulator/pause",
      simulatorResume: "/simulator/resume"
    },
    documentation: "See README.md for API details"
  });
});

module.exports = router;
