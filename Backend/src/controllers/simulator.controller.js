const simulator = require("../services/flights/simulator");

class SimulatorController {
  async status(_req, res) {
    try {
      res.json({ running: simulator.isActive() });
    } catch (error) {
      res.status(500).json({ error: "Failed to get simulator status", message: error.message });
    }
  }

  async pause(_req, res) {
    try {
      simulator.stop();
      res.json({ message: "Simulator paused", running: simulator.isActive() });
    } catch (error) {
      res.status(500).json({ error: "Failed to pause simulator", message: error.message });
    }
  }

  async resume(_req, res) {
    try {
      const interval = Number(process.env.TICK_MS) || 3000;
      simulator.start(interval);
      res.json({ message: "Simulator resumed", running: simulator.isActive(), intervalMs: interval });
    } catch (error) {
      res.status(500).json({ error: "Failed to resume simulator", message: error.message });
    }
  }
}

module.exports = new SimulatorController();
