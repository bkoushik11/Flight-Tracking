# Flight Tracker Backend

A real-time flight tracking backend that simulates live flight data and streams it to clients via REST API and WebSockets.

## 🚀 Features

- **Real-time Flight Simulation**: Generates and updates flight positions every 3 seconds
- **REST API**: Get current flight data, reset simulations, and manage flights
- **WebSocket Streaming**: Live flight updates via Socket.io
- **In-Memory Storage**: Fast, lightweight storage for rapid development
- **Admin Endpoints**: Reset and seed flight simulations

## 🛠️ Tech Stack

- **Node.js** + **Express** → REST API
- **Socket.io** → Real-time WebSocket updates
- **CORS** → Cross-origin resource sharing
- **dotenv** → Environment configuration
- **nodemon** → Development auto-reload

## 📁 Project Structure

```
src/
├── index.js              # Server bootstrap & Socket.io setup
├── app.js                # Express app configuration
├── routes/               # API route definitions
│   ├── index.js         # Route composition
│   ├── health.routes.js # Health check endpoints
│   └── flights.routes.js# Flight management endpoints
├── controllers/          # HTTP request handlers
│   ├── health.controller.js
│   └── flights.controller.js
├── services/             # Business logic layer
│   └── flights/
│       ├── simulator.js  # Flight simulation engine
│       ├── flightStore.js# In-memory data store
│       └── flightService.js # Business operations
├── sockets/              # WebSocket event handlers
│   └── flights.gateway.js
├── middlewares/          # Express middleware
│   └── errorHandler.js
└── utils/                # Utility functions
    └── constants.js
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root directory:
```env
PORT=5000
TICK_MS=3000
CORS_ORIGIN=*
FLIGHT_COUNT=8
NODE_ENV=development
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Flights
- `GET /` - Get all flights
- `GET /:id` - Get specific flight by ID
- `GET /count` - Get total flight count
- `POST /reset` - Reset all flights
- `POST /seed` - Seed flights with custom count

### Root
- `GET /` - API information and available endpoints

## 🔌 WebSocket Events

### Client → Server
- `request_flights` - Request current flight data
- `request_flight_count` - Request flight count

### Server → Client
- `flights` - Flight data updates (emitted every tick)
- `flight_count` - Current flight count
- `system_message` - System notifications
- `error` - Error messages

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `TICK_MS` | 3000 | Flight update interval (ms) |
| `CORS_ORIGIN` | * | Allowed CORS origins |
| `FLIGHT_COUNT` | 8 | Number of simulated flights |
| `NODE_ENV` | development | Environment mode |

## 🎯 Flight Simulation

The simulator generates flights with realistic properties:
- **Position**: Random coordinates near India
- **Altitude**: 10,000 - 38,000 feet
- **Speed**: 220 - 520 knots
- **Status**: on-time, delayed, landed, lost comm
- **History**: Tracks last 50 position updates

## 🔄 Development Workflow

1. **Start development server**: `npm run dev`
2. **Make changes**: Files auto-reload with nodemon
3. **Test endpoints**: Use Postman or curl
4. **Test WebSockets**: Use Socket.io client or browser console

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test flights endpoint
curl http://localhost:5000/flights

# Test WebSocket connection
# Use browser console or Socket.io client
```

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production.

### Process Management
Use PM2 or similar process manager:
```bash
npm install -g pm2
pm2 start src/index.js --name "flight-tracker"
```

## 📝 License

ISC License

## 🤝 Contributing

This is an assignment project. Feel free to extend and improve the functionality!
