require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const database = require("./config/database");
const flightService = require("./services/flights/flightService");
const FlightsGateway = require("./sockets/flights.gateway");

const { CONFIG } = require("./utils/constants");
const PORT = CONFIG.PORT;
const TICK_MS = CONFIG.TICK_MS;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CONFIG.CORS_ORIGIN === "*" ? true : CONFIG.CORS_ORIGIN.split(",").map(s => s.trim()) },
});

// Initialize socket gateway
const flightsGateway = new FlightsGateway(io);

// Set up periodic flight data fetching from OpenSky API
let updateInterval;

const fetchAndBroadcastFlights = async () => {
  try {
    console.log('🔄 Fetching flights from OpenSky API at:', new Date().toISOString());
    const flights = await flightService.getAllFlights();
    console.log(`📡 Broadcasting ${flights.length} flights to clients`);
    flightsGateway.broadcastFlightUpdate(flights);
    
    // Also broadcast individual flight updates for better real-time experience
    flights.forEach(flight => {
      // Update individual flight history
      const nowTs = Date.now();
      const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
      if (!flightService.flightHistories.has(flight.id)) {
        flightService.flightHistories.set(flight.id, []);
      }
      const arr = flightService.flightHistories.get(flight.id);
      arr.push(position);
      if (arr.length > 50) {
        arr.splice(0, arr.length - 50);
      }
      // attach copy of history to response object
      flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
    });
    
    console.log(`✅ Broadcasted ${flights.length} flights at:`, new Date().toISOString());
  } catch (error) {
    console.error('Error fetching flights:', error);
  }
};

// Add additional logging for periodic updates
const startPeriodicUpdates = () => {
  updateInterval = setInterval(() => {
    console.log('⏰ Triggering periodic flight update at:', new Date().toISOString());
    fetchAndBroadcastFlights();
  }, TICK_MS);
  console.log(`🔄 Started periodic flight updates every ${TICK_MS}ms`);
};

startPeriodicUpdates();

// Initial fetch
fetchAndBroadcastFlights();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Disconnect from database
  await database.disconnect();
  
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\nGracefully shutting down...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Disconnect from database
  await database.disconnect();
  
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Initialize server with database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    
    // Get database stats
    const stats = await database.getStats();
    if (stats) {
      console.log('📊 Database Stats:', stats);
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Flight Tracker Backend running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server ready for real-time updates`);
      console.log(`✈️  OpenSky API integration enabled with ${TICK_MS}ms refresh interval`);
      console.log(`🔐 Authentication endpoints available at /api/auth`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
