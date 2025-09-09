const flightService = require("../services/flights/flightService");

class FlightsController {
  async getAllFlights(_req, res) {
    try {
      const flights = flightService.getAllFlights();
      res.json({ flights, total: flights.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flights", message: error.message });
    }
  }

  async getFlightById(req, res) {
    try {
      const id = String(req.params.id || "").trim();
      if (!id) {
        return res.status(400).json({ error: "Validation Error", message: "id is required" });
      }

      const flight = flightService.getFlight(id);
      if (!flight) {
        return res.status(404).json({ error: "Flight not found", message: `No flight found with ID: ${id}` });
      }

      res.json(flight);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flight", message: error.message });
    }
  }

  async resetFlights(_req, res) {
    try {
      const flights = flightService.resetFlights();
      res.json({ message: "Flights reset successfully", count: flights.length, flights });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset flights", message: error.message });
    }
  }


  async getFlightCount(_req, res) {
    try {
      const count = flightService.getFlightCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get flight count", message: error.message });
    }
  }
}

module.exports = new FlightsController();
