const { z } = require("zod");
const flightService = require("../services/flights/flightService");

const idSchema = z.string().min(1, "id is required");
const seedSchema = z.object({ count: z.number().int().min(1).max(2000).optional() });

class FlightsController {
  async getAllFlights(req, res) {
    try {
      const flights = flightService.getAllFlights();

      // Optional server-side filtering & pagination (backward compatible API shape)
      const minAltitude = req.query.minAltitude ? Number(req.query.minAltitude) : undefined;
      const maxAltitude = req.query.maxAltitude ? Number(req.query.maxAltitude) : undefined;
      const statusesParam = typeof req.query.statuses === "string" ? String(req.query.statuses) : undefined;
      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
      const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : flights.length;

      const requestedStatuses = statusesParam
        ? statusesParam.split(",").map((s) => s.trim().toLowerCase())
        : [];

      const normalized = flights.map((f) => ({
        ...f,
        // Normalize status to support both "lost comm" and "lost-comm"
        status: String(f.status).toLowerCase().replace("_", " ").replace("-", " "),
      }));

      const filtered = normalized.filter((f) => {
        const altMinOk = typeof minAltitude === "number" ? f.altitude >= minAltitude : true;
        const altMaxOk = typeof maxAltitude === "number" ? f.altitude <= maxAltitude : true;
        const statusOk = requestedStatuses.length
          ? requestedStatuses.includes(f.status.replace(" ", "-")) || requestedStatuses.includes(f.status)
          : true;
        return altMinOk && altMaxOk && statusOk;
      });

      const total = filtered.length;
      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      res.json({ flights: paged, total, page, limit });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flights", message: error.message });
    }
  }

  async getFlightById(req, res) {
    try {
      const parse = idSchema.safeParse(req.params.id);
      if (!parse.success) {
        return res.status(400).json({ error: "Validation Error", details: parse.error.flatten() });
      }

      const flight = flightService.getFlight(parse.data);
      if (!flight) {
        return res.status(404).json({ error: "Flight not found", message: `No flight found with ID: ${parse.data}` });
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

  async seedFlights(req, res) {
    try {
      const parsed = seedSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation Error", details: parsed.error.flatten() });
      }

      const flights = flightService.seedFlights(parsed.data.count ?? null);
      res.json({ message: "Flights seeded successfully", count: flights.length, flights });
    } catch (error) {
      res.status(500).json({ error: "Failed to seed flights", message: error.message });
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
