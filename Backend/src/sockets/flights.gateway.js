const flightService = require("../services/flights/flightService");

class FlightsGateway {
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Send current flights immediately on connect
      this.sendCurrentFlights(socket);

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });

      socket.on("request_flights", () => {
        this.sendCurrentFlights(socket);
      });

      socket.on("request_flight_count", () => {
        const count = flightService.getFlightCount();
        socket.emit("flight_count", { count });
      });

      // Subscribe to a single flight by ID (join room)
      socket.on("subscribe_flight", ({ id }) => {
        if (!id) return;
        socket.join(this._flightRoom(id));
        const flight = flightService.getFlight(id);
        if (flight) {
          socket.emit("flight", flight);
        } else {
          socket.emit("error", { message: `Flight ${id} not found` });
        }
      });

      // Unsubscribe from a single flight by ID (leave room)
      socket.on("unsubscribe_flight", ({ id }) => {
        if (!id) return;
        socket.leave(this._flightRoom(id));
      });
    });
  }

  // Emit full flights list to one socket
  sendCurrentFlights(socket) {
    try {
      const flights = flightService.getAllFlights();
      socket.emit("flights", flights);
    } catch (error) {
      console.error("Error sending flights to client:", error);
      socket.emit("error", { message: "Failed to fetch flights", error: error.message });
    }
  }

  // Broadcast flight updates to all connected clients
  broadcastFlightUpdate(flights) {
    // broadcast aggregated list
    this.io.emit("flights", flights);

    // also broadcast per-flight to subscribed rooms
    flights.forEach((flight) => {
      this.io.to(this._flightRoom(flight.id)).emit("flight", flight);
    });
  }

  _flightRoom(id) {
    return `flight:${id}`;
  }

  getConnectedClients() {
    return this.io.engine.clientsCount;
  }

  broadcastSystemMessage(message, type = "info") {
    this.io.emit("system_message", { message, type, timestamp: Date.now() });
  }
}

module.exports = FlightsGateway;
