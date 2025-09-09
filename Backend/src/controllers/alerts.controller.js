const alertService = require("../services/alerts/alertService");

class AlertsController {
  async getAllAlerts(_req, res) {
    try {
      const alerts = alertService.getAllAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts", message: error.message });
    }
  }

  async getFlightAlerts(req, res) {
    try {
      const flightId = String(req.params.flightId || "").trim();
      if (!flightId) {
        return res.status(400).json({ error: "Validation Error", message: "flightId is required" });
      }

      const alerts = alertService.getFlightAlerts(flightId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flight alerts", message: error.message });
    }
  }

  async dismissAlert(req, res) {
    try {
      const alertId = String(req.params.alertId || "").trim();
      if (!alertId) {
        return res.status(400).json({ error: "Validation Error", message: "alertId is required" });
      }

      const dismissed = alertService.dismissAlert(alertId);
      if (!dismissed) {
        return res.status(404).json({ error: "Alert not found", message: `No alert found with ID: ${alertId}` });
      }

      res.json({ message: "Alert dismissed successfully", alertId });
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss alert", message: error.message });
    }
  }

  async getRestrictedZones(_req, res) {
    try {
      const zones = alertService.getRestrictedZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restricted zones", message: error.message });
    }
  }

  async clearAllAlerts(_req, res) {
    try {
      alertService.clearAllAlerts();
      res.json({ message: "All alerts cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear alerts", message: error.message });
    }
  }
}

module.exports = new AlertsController();
