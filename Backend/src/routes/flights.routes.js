const express = require("express");
const flightsController = require("../controllers/flights.controller");

const router = express.Router();

// Get all flights
router.get("/", flightsController.getAllFlights);

// Get flight count (place BEFORE :id to avoid route conflict)
router.get("/count", flightsController.getFlightCount);

// Get flight by ID
router.get("/:id", flightsController.getFlightById);

// Reset all flights (admin endpoint)
router.post("/reset", flightsController.resetFlights);

// Seed flights (admin endpoint)
router.post("/seed", flightsController.seedFlights);

module.exports = router;
