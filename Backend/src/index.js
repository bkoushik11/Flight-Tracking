require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const simulator = require("./services/flights/simulator");
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

// Connect simulator to socket gateway
simulator.on("tick", (flights) => {
  flightsGateway.broadcastFlightUpdate(flights);
});

// Start the simulator loop
simulator.start(TICK_MS);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nGracefully shutting down...");
  simulator.stop();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\nGracefully shutting down...");
  simulator.stop();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Flight Tracker Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`⏱️  Flight updates every ${TICK_MS}ms`);
});
