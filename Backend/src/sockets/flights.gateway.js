const flightService = require("../services/flights/flightService");

class FlightsGateway {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const clientInfo = {
      id: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscribedFlights: new Set()
    };
    
    this.connectedClients.set(socket.id, clientInfo);

    // Send current flights immediately on connect
    this.sendCurrentFlights(socket);

    // Set up event handlers
    socket.on("disconnect", () => this.handleDisconnection(socket));
    socket.on("request_flights", () => this.handleFlightRequest(socket));
    socket.on("request_flight_count", () => this.handleFlightCountRequest(socket));
    socket.on("subscribe_flight", (data) => this.handleFlightSubscription(socket, data));
    socket.on("unsubscribe_flight", (data) => this.handleFlightUnsubscription(socket, data));
    socket.on("ping", () => this.handlePing(socket));
  }

  handleDisconnection(socket) {
    this.connectedClients.delete(socket.id);
  }

  async handleFlightRequest(socket) {
    this.updateClientActivity(socket.id);
    await this.sendCurrentFlights(socket);
  }

  handleFlightCountRequest(socket) {
    this.updateClientActivity(socket.id);
    try {
      const count = flightService.getFlightCount();
      socket.emit("flight_count", { count });
    } catch (error) {
      console.error("Error getting flight count:", error);
      socket.emit("error", { message: "Failed to get flight count" });
    }
  }

  async handleFlightSubscription(socket, { id }) {
    if (!id) {
      socket.emit("error", { message: "Flight ID is required" });
      return;
    }

    this.updateClientActivity(socket.id);
    socket.join(this._flightRoom(id));
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.subscribedFlights.add(id);
    }

    try {
      console.log(`📥 Client ${socket.id} subscribed to flight ${id}`);
      // Force refresh to get the latest data for this flight
      const flights = await flightService.getAllFlights();
      const flight = flights.find(f => f.id === id) || null;
      
      if (flight) {
        // Update flight history before sending
        const nowTs = Date.now();
        const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
        if (!flightService.flightHistories.has(id)) {
          flightService.flightHistories.set(id, []);
        }
        const arr = flightService.flightHistories.get(id);
        arr.push(position);
        if (arr.length > 50) {
          arr.splice(0, arr.length - 50);
        }
        // attach copy of history to response object
        flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
        
        socket.emit("flight", flight);
        console.log(`📤 Sent initial flight data for ${id} to client ${socket.id}`);
        console.log(`   Position: ${flight.lat.toFixed(4)}, ${flight.lng.toFixed(4)} | Alt: ${flight.altitude} | Speed: ${flight.speed}`);
      } else {
        console.log(`⚠️ Flight ${id} not found for client ${socket.id}`);
        socket.emit("error", { message: `Flight ${id} not found` });
      }
    } catch (error) {
      console.error("Error subscribing to flight:", error);
      socket.emit("error", { message: "Failed to subscribe to flight" });
    }
  }

  handleFlightUnsubscription(socket, { id }) {
    if (!id) return;

    this.updateClientActivity(socket.id);
    socket.leave(this._flightRoom(id));
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.subscribedFlights.delete(id);
    }
  }

  handlePing(socket) {
    this.updateClientActivity(socket.id);
    socket.emit("pong", { timestamp: Date.now() });
  }

  updateClientActivity(socketId) {
    const clientInfo = this.connectedClients.get(socketId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
  }

  async sendCurrentFlights(socket) {
    try {
      const flights = await flightService.getAllFlights();
      socket.emit("flights", flights);
    } catch (error) {
      socket.emit("error", { 
        message: "Failed to fetch flights", 
        error: error.message 
      });
    }
  }

  broadcastFlightUpdate(flights) {
    try {
      // Broadcast aggregated list to all clients
      this.io.emit("flights", flights);

      // Broadcast individual flight updates to subscribed clients
      flights.forEach((flight) => {
        const room = this._flightRoom(flight.id);
        const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
        if (roomSize > 0) {
          console.log(`📡 Broadcasting flight ${flight.id} to ${roomSize} subscribers at ${new Date().toISOString()}`);
          console.log(`   Position: ${flight.lat.toFixed(4)}, ${flight.lng.toFixed(4)} | Alt: ${flight.altitude} | Speed: ${flight.speed}`);
          this.io.to(room).emit("flight", flight);
        }
      });
    } catch (error) {
      console.error("Error broadcasting flight updates:", error);
    }
  }

  broadcastAlerts(alerts) {
    try {
      this.io.emit("alerts", alerts);
    } catch (error) {
      console.error("Error broadcasting alerts:", error);
    }
  }

  broadcastSystemMessage(message, type = "info") {
    try {
      this.io.emit("system_message", { 
        message, 
        type, 
        timestamp: Date.now() 
      });
    } catch (error) {
      console.error("Error broadcasting system message:", error);
    }
  }

  _flightRoom(id) {
    return `flight:${id}`;
  }

  getConnectedClients() {
    return this.connectedClients.size;
  }

  getClientInfo() {
    return Array.from(this.connectedClients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      subscribedFlights: Array.from(client.subscribedFlights)
    }));
  }

  // Cleanup inactive clients (call periodically)
  cleanupInactiveClients(maxInactiveMinutes = 30) {
    const now = new Date();
    const inactiveClients = [];

    for (const [socketId, clientInfo] of this.connectedClients) {
      const inactiveMinutes = (now - clientInfo.lastActivity) / (1000 * 60);
      if (inactiveMinutes > maxInactiveMinutes) {
        inactiveClients.push(socketId);
      }
    }

    inactiveClients.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      this.connectedClients.delete(socketId);
    });

    if (inactiveClients.length > 0) {
      console.log(`Cleaned up ${inactiveClients.length} inactive clients`);
    }
  }
}

module.exports = FlightsGateway;
