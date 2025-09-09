const { EventEmitter } = require("events");
const flightService = require("./flightService");
const alertService = require("../alerts/alertService");

class FlightSimulator extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.isRunning = false;
  }

  start(intervalMs = 3000) {
    if (this.timer) {
      this.stop();
    }
    
    // Seed initial flights if none exist
    if (flightService.getFlightCount() === 0) {
      flightService.seedFlights();
    }
    
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.isRunning = true;
    console.log(`Flight simulator started with ${intervalMs}ms intervals`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
      console.log("Flight simulator stopped");
    }
  }

  tick() {
    const updatedFlights = flightService.updateFlightPositions();
    
    // Process alerts for the updated flights
    const newAlerts = alertService.processFlights(updatedFlights);
    
    // Emit both flight updates and any new alerts
    this.emit("tick", updatedFlights);
    if (newAlerts.length > 0) {
      this.emit("alerts", newAlerts);
    }
  }

  getFlights() {
    return flightService.getAllFlights();
  }

  reset() {
    const flights = flightService.resetFlights();
    this.emit("tick", flights);
    return flights;
  }

  seed(count = null) {
    const flights = flightService.seedFlights(count);
    this.emit("tick", flights);
    return flights;
  }

  isActive() {
    return this.isRunning;
  }
}

module.exports = new FlightSimulator();
