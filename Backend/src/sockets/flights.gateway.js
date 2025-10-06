const flightService = require("../services/flights/flightService");

class FlightsGateway {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.clientRequestTimes = new Map(); // Track client request times to prevent abuse
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
      subscribedFlights: new Set(),
      lastRequestTime: 0 // Track last request time for this client
    };
    
    this.connectedClients.set(socket.id, clientInfo);

    console.log(`✅ Client connected: ${socket.id}`);

    // Send current flights immediately on connect
    this.sendCurrentFlights(socket);

    // Set up event handlers
    socket.on("disconnect", () => this.handleDisconnection(socket));
    socket.on("request_flights", () => this.handleFlightRequest(socket));
    socket.on("request_flight_count", () => this.handleFlightCountRequest(socket));
    socket.on("subscribe_flight", (data) => this.handleFlightSubscription(socket, data));
    socket.on("unsubscribe_flight", (data) => this.handleFlightUnsubscription(socket, data));
    socket.on("ping", () => this.handlePing(socket));
    socket.on("refresh_flights", () => this.handleFlightRefresh(socket)); // Add refresh handler
  }

  handleDisconnection(socket) {
    this.connectedClients.delete(socket.id);
    this.clientRequestTimes.delete(socket.id);
    console.log(`❌ Client disconnected: ${socket.id}`);
  }

  async handleFlightRequest(socket) {
    const now = Date.now();
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (clientInfo) {
      if (now - clientInfo.lastRequestTime < 120000) {
        const secondsRemaining = Math.ceil((120000 - (now - clientInfo.lastRequestTime)) / 1000);
        console.log(`⏭️ Client ${socket.id} requesting too frequently (${secondsRemaining}s left)`);
        socket.emit("error", { 
          message: `Please wait ${secondsRemaining} seconds before requesting flights again` 
        });
        return;
      }
      clientInfo.lastRequestTime = now;
      this.updateClientActivity(socket.id);
    }
    
    console.log(`📥 Client ${socket.id} requested flights`);
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

  async handleFlightRefresh(socket) {
    const now = Date.now();
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (clientInfo) {
      if (now - clientInfo.lastRequestTime < 120000) {
        const secondsRemaining = Math.ceil((120000 - (now - clientInfo.lastRequestTime)) / 1000);
        console.log(`⏭️ Client ${socket.id} requesting refresh too frequently (${secondsRemaining}s left)`);
        socket.emit("error", { 
          message: `Please wait ${secondsRemaining} seconds before refreshing flights` 
        });
        return;
      }
      clientInfo.lastRequestTime = now;
      this.updateClientActivity(socket.id);
    }
    
    console.log(`🔄 Client ${socket.id} requested flight refresh`);
    await this.sendCurrentFlights(socket);
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
      const flights = await flightService.getAllFlights();
      const flight = flights.find(f => f.id === id) || null;
      
      if (flight) {
        const nowTs = Date.now();
        const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
        if (!flightService.flightHistories.has(id)) {
          flightService.flightHistories.set(id, []);
        }
        const arr = flightService.flightHistories.get(id);
        arr.push(position);
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500);
        }
        flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
        
        socket.emit("flight", flight);
        console.log(`📤 Sent initial flight data for ${id} to client ${socket.id}`);
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
    console.log(`🚪 Client ${socket.id} unsubscribed from flight ${id}`);
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
      console.log(`📤 Sent ${flights.length} flights to client ${socket.id}`);
    } catch (error) {
      socket.emit("error", { 
        message: "Failed to fetch flights", 
        error: error.message 
      });
    }
  }

  broadcastFlightUpdate(flights) {
    try {
      // Basic rate limiting to avoid overly frequent emits
      const now = Date.now();
      if (!this._lastBroadcastTs || now - this._lastBroadcastTs > 400) {
        this._lastBroadcastTs = now;
        this.io.emit("flights", flights);
      }

      flights.forEach((flight) => {
        const room = this._flightRoom(flight.id);
        const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
        if (roomSize > 0) {
          console.log(`📡 Broadcasting flight ${flight.id} to ${roomSize} subscribers`);
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
      this.clientRequestTimes.delete(socketId);
    });

    if (inactiveClients.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveClients.length} inactive clients`);
    }
  }
}

module.exports = FlightsGateway;