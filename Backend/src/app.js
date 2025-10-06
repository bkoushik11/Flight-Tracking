const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");

const flightService = require("./services/flights/flightService.js");

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN === "*" 
    ? true 
    : process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// app.use('/api', (req,res) => {
// try{
//    const url = req.response2.data;
//     console.log(url);
//     res.json(url)
// } catch (error) {
//   res.status(500).json({ error: error.message });
// }})

// Add a status endpoint for debugging
app.get('/api/status', (req, res) => {
  try {
    const stats = flightService.getStats();
    const status = {
      ...stats,
      currentTime: new Date(),
      backoffActive: flightService.rateLimitBackoff > Date.now(),
      backoffEndTime: flightService.rateLimitBackoff ? new Date(flightService.rateLimitBackoff) : null,
      cacheAvailable: flightService.flightCache.size > 0,
      cacheSize: flightService.flightCache.size,
      tokenValid: flightService.accessToken && Date.now() < flightService.tokenExpiry,
      tokenExpiry: flightService.tokenExpiry ? new Date(flightService.tokenExpiry) : null
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an endpoint to manually clear rate limit backoff
app.post('/api/clear-backoff', (req, res) => {
  try {
    flightService.clearRateLimitBackoff();
    res.json({ message: 'Rate limit backoff cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an endpoint to force refresh flights
app.post('/api/force-refresh', async (req, res) => {
  try {
    console.log('Force refreshing flights...');
    const flights = await flightService.forceRefreshFlights();
    res.json({ 
      message: 'Flights refreshed', 
      flightCount: flights.length,
      flights: flights.slice(0, 5) // Return first 5 flights as sample
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount API routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
