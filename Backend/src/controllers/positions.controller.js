const mongoose = require('mongoose');
const FlightPosition = require('../models/FlightPosition');

class PositionsController {
  // Start recording for a specific flight: reset or create positions doc
  async startRecording(req, res) {
    try {
      const flightId = String(req.body.flightId || '').trim();
      if (!flightId) {
        return res.status(400).json({ error: 'Missing flightId in body' });
      }
      // Reset existing positions for this flight (start from scratch)
      let doc = await FlightPosition.findOne({ flightId });
      if (!doc) {
        doc = new FlightPosition({ flightId, positions: [] });
      } else {
        doc.positions = [];
      }
      await doc.save();
      return res.json({ success: true, message: 'Recording started', flightId });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start recording:', error);
      return res.status(500).json({ error: 'Failed to start recording', message: error.message });
    }
  }

  // Stop recording: no-op server side (client stops sending), but keep data
  async stopRecording(req, res) {
    try {
      const flightId = String(req.body.flightId || '').trim();
      if (!flightId) {
        return res.status(400).json({ error: 'Missing flightId in body' });
      }
      return res.json({ success: true, message: 'Recording stopped', flightId });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to stop recording', message: error.message });
    }
  }

  // Append a position sample (used by client polling or socket integration)
  async addPosition(req, res) {
    try {
      const flightId = String(req.body.flightId || '').trim();
      const { latitude, longitude, heading = 0, altitude = 0, speed = 0 } = req.body || {};
      if (!flightId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      let doc = await FlightPosition.findOne({ flightId });
      if (!doc) {
        doc = new FlightPosition({ flightId, positions: [] });
      }
      const result = await doc.addPosition(Number(latitude), Number(longitude), Number(heading), Number(altitude), Number(speed));
      return res.json({ success: true, ...result, flightId });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add position:', error);
      return res.status(500).json({ error: 'Failed to add position', message: error.message });
    }
  }

  // List recorded flights (IDs)
  async listRecordedFlights(_req, res) {
    try {
      const docs = await FlightPosition.find({}, { flightId: 1 }).lean();
      const ids = docs.map(d => d.flightId);
      return res.json({ success: true, flightIds: ids });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to list recorded flights', message: error.message });
    }
  }

  // Delete recorded positions for a flightId
  async deleteRecordedFlight(req, res) {
    try {
      const flightId = String(req.params.flightId || '').trim();
      if (!flightId) {
        return res.status(400).json({ error: 'Missing flightId' });
      }
      const result = await FlightPosition.deleteOne({ flightId });
      return res.json({ success: true, deletedCount: result.deletedCount || 0, flightId });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete recorded flight', message: error.message });
    }
  }

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


