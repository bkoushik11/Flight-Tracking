const express = require("express");
const alertsController = require("../controllers/alerts.controller");

const router = express.Router();

// Get all alerts
router.get("/", alertsController.getAllAlerts);

// Get alerts for a specific flight
router.get("/flight/:flightId", alertsController.getFlightAlerts);

// Dismiss an alert
router.delete("/:alertId", alertsController.dismissAlert);

// Get restricted zones
router.get("/zones", alertsController.getRestrictedZones);

// Clear all alerts (admin endpoint)
router.delete("/", alertsController.clearAllAlerts);

module.exports = router;
