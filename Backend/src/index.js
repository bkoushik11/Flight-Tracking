require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
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
    const flights = await flightService.getAllFlights();
    flightsGateway.broadcastFlightUpdate(flights);
  } catch (error) {
    console.error('Error fetching flights:', error);
  }
};

// Start periodic updates for real-time data
const startPeriodicUpdates = () => {
  updateInterval = setInterval(fetchAndBroadcastFlights, TICK_MS);
  console.log(`🔄 Started periodic flight updates every ${TICK_MS}ms`);
};

startPeriodicUpdates();

// Initial fetch
fetchAndBroadcastFlights();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nGracefully shutting down...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\nGracefully shutting down...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Flight Tracker Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`✈️  OpenSky API integration enabled with ${TICK_MS}ms refresh interval`);
});
