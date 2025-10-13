const mongoose = require('mongoose');
const FlightPosition = require('../models/FlightPosition');

class PositionsController {
  async getDefaultPositions(req, res) {
    try {
      const fallbackId = process.env.DEFAULT_FLIGHT_ID || '80163c';
      const flightId = String(req.query.flightId || fallbackId);

      if (!flightId) {
        return res.status(400).json({ error: 'Missing flightId parameter' });
      }

      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Service Unavailable', message: 'Database not connected' });
      }

      // Primary schema: one document per position in 'positions' collection
      let positions = await FlightPosition.getFlightPositions(flightId);

      // Fallback schema (as per your Compass screenshot):
      // one document per flight in 'flightpositions' with an array field 'positions'
      if (!positions || positions.length === 0) {
        const coll = mongoose.connection.db.collection('flightpositions');
        const doc = await coll.findOne(
          { flightId },
          { projection: { _id: 0, positions: 1 } }
        );
        if (doc && Array.isArray(doc.positions)) {
          positions = doc.positions
            .map(p => ({
              lat: Number(p.latitude ?? p.lat ?? 0),
              lng: Number(p.longitude ?? p.lng ?? 0),
              heading: Number(p.heading ?? 0),
              altitude: Number(p.altitude ?? 0),
              speed: Number(p.speed ?? 0),
              timestamp: p.timestamp ? new Date(p.timestamp) : new Date(0)
            }))
            .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } else {
          positions = [];
        }
      }

      return res.json({ success: true, flightId, positions, count: positions.length });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch positions:', error);
      return res.status(500).json({ error: 'Failed to get default flight positions', message: error.message });
    }
  }
}

module.exports = new PositionsController();


