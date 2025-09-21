const flightStore = require("./flightStore");
const { GEOGRAPHIC_BOUNDS, FLIGHT_SIMULATION } = require("../../utils/constants");

class FlightService {
  constructor() {
    this.flightCount = Number(process.env.FLIGHT_COUNT) || 80;
    this.updateStats = {
      totalUpdates: 0,
      lastUpdate: null,
      averageUpdateTime: 0
    };
  }

  getAllFlights() {
    try {
      return flightStore.getAllFlights();
    } catch (error) {
      console.error("Error getting all flights:", error);
      return [];
    }
  }

  getFlight(id) {
    if (!id) {
      throw new Error("Flight ID is required");
    }
    
    try {
      return flightStore.getFlight(id);
    } catch (error) {
      console.error(`Error getting flight ${id}:`, error);
      return null;
    }
  }

  seedFlights(count = null) {
    try {
      const flightCount = count || this.flightCount;
      console.log(`Seeding ${flightCount} flights`);
      return flightStore.seedFlights(flightCount);
    } catch (error) {
      console.error("Error seeding flights:", error);
      throw error;
    }
  }

  resetFlights() {
    try {
      console.log("Resetting all flights");
      return flightStore.reset();
    } catch (error) {
      console.error("Error resetting flights:", error);
      throw error;
    }
  }

  updateFlightPositions() {
    const startTime = Date.now();
    
    try {
      const flights = flightStore.getAllFlights();
      const updatedFlights = [];
      
      flights.forEach(flight => {
        if (flight.status === "landed") {
          updatedFlights.push(flight);
          return;
        }

        const updatedFlight = this._updateSingleFlight(flight);
        updatedFlights.push(updatedFlight);
      });

      // Update statistics
      this._updateStats(startTime);
      
      return updatedFlights;
    } catch (error) {
      console.error("Error updating flight positions:", error);
      return flightStore.getAllFlights();
    }
  }

  _updateSingleFlight(flight) {
    try {
      // Calculate position changes
      const positionChange = this._calculatePositionChange();
      
      // Calculate flight dynamics
      const dynamics = this._calculateFlightDynamics(flight);
      
      // Calculate status changes
      const status = this._calculateStatusChange(flight.status);
      
      // Clamp to geographic bounds
      const newPosition = this._clampToBounds(
        flight.lat + positionChange.lat,
        flight.lng + positionChange.lng
      );

      // Update flight in store
      flightStore.updateFlight(flight.id, {
        lat: newPosition.lat,
        lng: newPosition.lng,
        altitude: dynamics.altitude,
        speed: dynamics.speed,
        heading: dynamics.heading,
        status
      });

      return flightStore.getFlight(flight.id);
    } catch (error) {
      console.error(`Error updating flight ${flight.id}:`, error);
      return flight;
    }
  }

  _calculatePositionChange() {
    return {
      lat: this._rand(-FLIGHT_SIMULATION.POSITION_CHANGE_RANGE, FLIGHT_SIMULATION.POSITION_CHANGE_RANGE),
      lng: this._rand(-FLIGHT_SIMULATION.POSITION_CHANGE_RANGE, FLIGHT_SIMULATION.POSITION_CHANGE_RANGE)
    };
  }

  _calculateFlightDynamics(flight) {
    return {
      altitude: Math.max(
        GEOGRAPHIC_BOUNDS.ALTITUDE_MIN, 
        Math.min(GEOGRAPHIC_BOUNDS.ALTITUDE_MAX, 
          flight.altitude + Math.floor(this._rand(-800, 800))
        )
      ),
      speed: Math.max(
        GEOGRAPHIC_BOUNDS.SPEED_MIN, 
        Math.min(GEOGRAPHIC_BOUNDS.SPEED_MAX, 
          flight.speed + Math.floor(this._rand(-20, 20))
        )
      ),
      heading: (flight.heading + Math.floor(this._rand(-8, 8)) + 360) % 360
    };
  }

  _calculateStatusChange(currentStatus) {
    // Occasional status changes with different probabilities
    const random = Math.random();
    
    if (random < 0.005) return "landed";
    if (random < 0.01) return "lost comm";
    if (random < 0.01) return "delayed";
    
    return currentStatus;
  }

  _clampToBounds(lat, lng) {
    return {
      lat: Math.max(GEOGRAPHIC_BOUNDS.LAT_MIN, Math.min(GEOGRAPHIC_BOUNDS.LAT_MAX, lat)),
      lng: Math.max(GEOGRAPHIC_BOUNDS.LNG_MIN, Math.min(GEOGRAPHIC_BOUNDS.LNG_MAX, lng))
    };
  }

  _updateStats(startTime) {
    const updateTime = Date.now() - startTime;
    this.updateStats.totalUpdates++;
    this.updateStats.lastUpdate = new Date();
    this.updateStats.averageUpdateTime = 
      (this.updateStats.averageUpdateTime * (this.updateStats.totalUpdates - 1) + updateTime) / 
      this.updateStats.totalUpdates;
  }

  getFlightCount() {
    try {
      return flightStore.getCount();
    } catch (error) {
      console.error("Error getting flight count:", error);
      return 0;
    }
  }

  getStats() {
    return {
      ...this.updateStats,
      totalFlights: this.getFlightCount(),
      flightCount: this.flightCount
    };
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }
}

module.exports = new FlightService();
