const flightService = require("../services/flights/flightService");

class HealthController {
  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const flightCount = flightService.getFlightCount();
      const uptime = process.uptime();
      
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        flightCount,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: "Health check failed",
        message: error.message
      });
    }
  }
}

module.exports = new HealthController();
