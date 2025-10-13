require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const database = require("./config/database");
const flightService = require("./services/flights/flightService");
const FlightsGateway = require("./sockets/flights.gateway");

const { CONFIG } = require("./utils/constants");
const PORT = CONFIG.PORT;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CONFIG.CORS_ORIGIN === "*" ? true : CONFIG.CORS_ORIGIN.split(",").map(s => s.trim()) },
});

// Initialize socket gateway
const flightsGateway = new FlightsGateway(io);

// Store previous flight data to compare for changes
let previousFlights = [];
let isCheckingForChanges = false;

// Function to check for flight changes and broadcast if needed
const checkAndBroadcastFlightChanges = async () => {
  // Prevent multiple concurrent checks
  if (isCheckingForChanges) {
    console.log('Skipping check - already checking for changes');
    return;
  }
  
  isCheckingForChanges = true;
  
  try {
    console.log('Checking for flight changes at:', new Date().toISOString());
    
    // Check if we're in rate limit backoff period
    const currentTime = Date.now();
    const rateLimitBackoff = flightService.rateLimitBackoff;
    if (rateLimitBackoff > currentTime) {
      const backoffMinutes = Math.ceil((rateLimitBackoff - currentTime) / (60 * 1000));
      console.log(`Rate limit backoff active for ${backoffMinutes} more minutes until ${new Date(rateLimitBackoff).toLocaleTimeString()}`);
      // Check if we have cached data to send
      const cachedCount = flightService.getFlightCount();
      if (cachedCount > 0) {
        console.log(`Sending ${cachedCount} cached flights to clients during backoff`);
        const cachedFlights = Array.from(flightService.flightCache.values());
        flightsGateway.broadcastFlightUpdate(cachedFlights);
        return;
      } else {
        console.log('No cached flight data available during backoff period');
        flightsGateway.broadcastFlightUpdate([]);
        return;
      }
    }
    
    const currentFlights = await flightService.getAllFlights();
    
    // Always update flight histories and broadcast to ensure real-time updates
    console.log(`📤 Sent ${currentFlights.length} flights to client`);
    
    // Always update individual flight histories
    currentFlights.forEach(flight => {
      const nowTs = Date.now();
      const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
      if (!flightService.flightHistories.has(flight.id)) {
        flightService.flightHistories.set(flight.id, []);
      }
      const arr = flightService.flightHistories.get(flight.id);
      arr.push(position);
      if (arr.length > 500) {
        arr.splice(0, arr.length - 500);
      }
      flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
    });
    
    // Always broadcast current flights to keep clients updated
    flightsGateway.broadcastFlightUpdate(currentFlights);
    
    // Update previous flights data
    previousFlights = currentFlights;
    console.log(`✅ Broadcasted ${currentFlights.length} flights at:`, new Date().toISOString());
  } catch (error) {
    console.error('Error checking flight changes:', error);
    // Even on error, try to send cached data if available
    const cachedCount = flightService.getFlightCount();
    if (cachedCount > 0) {
      console.log(`Sending ${cachedCount} cached flights due to error`);
      const cachedFlights = Array.from(flightService.flightCache.values());
      flightsGateway.broadcastFlightUpdate(cachedFlights);
    } else {
      console.log('No flight data available, sending empty array to clients');
      flightsGateway.broadcastFlightUpdate([]);
    }
  } finally {
    isCheckingForChanges = false;
  }
};

// Function to compare flight data for changes with tolerance
const hasFlightDataChanged = (prevFlights, currentFlights) => {
  // If flight count changed, there are definitely changes
  if (prevFlights.length !== currentFlights.length) {
    return true;
  }
  
  // Check if any flight data has changed significantly
  const hasChanges = currentFlights.some((currentFlight, index) => {
    const prevFlight = prevFlights[index];
    
    // Define more sensitive tolerance levels for significant changes to ensure updates are visible
    const latTolerance = 0.005; // ~5 meters
    const lngTolerance = 0.005; // ~5 meters
    const altTolerance = 10;         // 10 feet
    const speedTolerance = 5;       // 5 knots
    const headingTolerance = 1;   // 1 degree
    
    return (
      Math.abs(currentFlight.lat - prevFlight.lat) > latTolerance ||
      Math.abs(currentFlight.lng - prevFlight.lng) > lngTolerance ||
      Math.abs(currentFlight.altitude - prevFlight.altitude) > altTolerance ||
      Math.abs(currentFlight.speed - prevFlight.speed) > speedTolerance ||
      Math.abs(currentFlight.heading - prevFlight.heading) > headingTolerance ||
      currentFlight.status !== prevFlight.status ||
      currentFlight.flightNumber !== prevFlight.flightNumber
    );
  });
  
  return hasChanges;
};

// Set up periodic flight fetching every 30 seconds (reduced frequency)
console.log('Setting up periodic flight fetching every 30 seconds');
setInterval(checkAndBroadcastFlightChanges, 30000);

// Initial fetch - only do this once on startup
checkAndBroadcastFlightChanges();

console.log('Flight updates will occur every 30 seconds or when data changes');

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down...");
  
  // Disconnect from database
  await database.disconnect();
  
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\nGracefully shutting down...");
  
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
      console.log(`Flight Tracker Backend running on http://localhost:${PORT}`);
      console.log(`WebSocket server ready for real-time updates`);
      console.log(` OpenSky API integration enabled with periodic updates every 30 seconds`);
      console.log(`Authentication endpoints available at /api/auth`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();