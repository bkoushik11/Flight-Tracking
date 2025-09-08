const flightStore = require("./flightStore");
const { GEOGRAPHIC_BOUNDS, FLIGHT_SIMULATION } = require("../../utils/constants");

class FlightService {
  constructor() {
    this.flightCount = Number(process.env.FLIGHT_COUNT) || 40;
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
      const dLat = this._rand(-FLIGHT_SIMULATION.POSITION_CHANGE_RANGE, FLIGHT_SIMULATION.POSITION_CHANGE_RANGE);
      const dLng = this._rand(-FLIGHT_SIMULATION.POSITION_CHANGE_RANGE, FLIGHT_SIMULATION.POSITION_CHANGE_RANGE);
      
      // Vary flight dynamics
      const altitude = Math.max(GEOGRAPHIC_BOUNDS.ALTITUDE_MIN, Math.min(GEOGRAPHIC_BOUNDS.ALTITUDE_MAX, 
        flight.altitude + Math.floor(this._rand(-800, 800))));
      const speed = Math.max(GEOGRAPHIC_BOUNDS.SPEED_MIN, Math.min(GEOGRAPHIC_BOUNDS.SPEED_MAX, 
        flight.speed + Math.floor(this._rand(-20, 20))));
      const heading = (flight.heading + Math.floor(this._rand(-8, 8)) + 360) % 360;
      
      // Occasional status changes
      let status = flight.status;
      if (Math.random() < 0.01) status = "lost comm";
      if (Math.random() < 0.01) status = "delayed";
      if (Math.random() < 0.005) status = "landed";

      // Clamp to India bounds
      const newLat = Math.max(GEOGRAPHIC_BOUNDS.LAT_MIN, Math.min(GEOGRAPHIC_BOUNDS.LAT_MAX, flight.lat + dLat));
      const newLng = Math.max(GEOGRAPHIC_BOUNDS.LNG_MIN, Math.min(GEOGRAPHIC_BOUNDS.LNG_MAX, flight.lng + dLng));

      flightStore.updateFlight(flight.id, {
        lat: newLat,
        lng: newLng,
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
