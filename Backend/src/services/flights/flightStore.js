const { randomUUID } = require("crypto");

class FlightStore {
  constructor() {
    this.flights = new Map();
    this.statuses = ["on-time", "delayed", "landed", "lost comm"];
    this.maxHistoryLength = 50;
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  _newFlight() {
    // Seed globally: latitude ~ -60 to 75 (avoid poles), longitude -180 to 180
    const lat = this._rand(-60, 75);
    const lng = this._rand(-180, 180);

    return {
      id: randomUUID().slice(0, 8),
      flightNumber: "FL-" + Math.floor(100 + Math.random() * 900),
      lat,
      lng,
      altitude: Math.floor(this._rand(10000, 38000)), // ft
      speed: Math.floor(this._rand(220, 520)),        // kts
      heading: Math.floor(this._rand(0, 360)),
      status: this.statuses[Math.floor(this._rand(0, this.statuses.length))],
      updatedAt: Date.now(),
      history: [{ lat, lng, ts: Date.now() }]
    };
  }

  seedFlights(count = 8) {
    this.flights.clear();
    for (let i = 0; i < count; i++) {
      const flight = this._newFlight();
      this.flights.set(flight.id, flight);
    }
    return this.getAllFlights();
  }

  getAllFlights() {
    return Array.from(this.flights.values());
  }

  getFlight(id) {
    return this.flights.get(id);
  }

  updateFlight(id, updates) {
    const flight = this.flights.get(id);
    if (!flight) return null;

    Object.assign(flight, updates);
    flight.updatedAt = Date.now();
    
    // Add to history if position changed
    if (updates.lat || updates.lng) {
      flight.history.push({ 
        lat: flight.lat, 
        lng: flight.lng, 
        ts: flight.updatedAt 
      });
      
      // Trim history
      if (flight.history.length > this.maxHistoryLength) {
        flight.history.shift();
      }
    }

    return flight;
  }

  reset() {
    this.flights.clear();
    return this.seedFlights();
  }

  getCount() {
    return this.flights.size;
  }
}

module.exports = new FlightStore();
