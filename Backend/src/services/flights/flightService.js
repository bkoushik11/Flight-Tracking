const flightStore = require("./flightStore");

class FlightService {
  constructor() {
    this.flightCount = Number(process.env.FLIGHT_COUNT) || 200;
  }

  getAllFlights() {
    return flightStore.getAllFlights();
  }

  getFlight(id) {
    return flightStore.getFlight(id);
  }

  seedFlights(count = null) {
    const flightCount = count || this.flightCount;
    return flightStore.seedFlights(flightCount);
  }

  resetFlights() {
    return flightStore.reset();
  }

  updateFlightPositions() {
    const flights = flightStore.getAllFlights();
    
    flights.forEach(flight => {
      if (flight.status === "landed") return;

      // Small random walk for position
      const dLat = this._rand(-0.08, 0.08);
      const dLng = this._rand(-0.08, 0.08);
      
      // Vary flight dynamics
      const altitude = Math.max(0, Math.min(40000, 
        flight.altitude + Math.floor(this._rand(-800, 800))));
      const speed = Math.max(140, Math.min(560, 
        flight.speed + Math.floor(this._rand(-20, 20))));
      const heading = (flight.heading + Math.floor(this._rand(-8, 8)) + 360) % 360;
      
      // Occasional status changes
      let status = flight.status;
      if (Math.random() < 0.01) status = "lost comm";
      if (Math.random() < 0.01) status = "delayed";
      if (Math.random() < 0.005) status = "landed";

      flightStore.updateFlight(flight.id, {
        lat: flight.lat + dLat,
        lng: flight.lng + dLng,
        altitude,
        speed,
        heading,
        status
      });
    });

    return flightStore.getAllFlights();
  }

  getFlightCount() {
    return flightStore.getCount();
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }
}

module.exports = new FlightService();
