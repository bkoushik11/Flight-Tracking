# Flight Tracker Backend

This backend powers a **real-time flight tracking web app**.  
It simulates live flight data and streams it to clients via **REST** and **WebSockets**.

---

## ⚡️ Tech Stack

- **Node.js** + **Express** → REST API  
- **Socket.io** → Real-time flight updates  
- **CORS** → Allow frontend (different origin) to connect  
- **dotenv** → Manage environment variables  
- **nodemon** (dev only) → Auto-restart on file changes  

---

## 🌍 Features

1. **Flight Simulator**
   - Generates flights with:
     - Flight ID / Number
     - Latitude / Longitude
     - Altitude
     - Speed
     - Heading
     - Status (on-time, delayed, landed, lost comm)
   - Updates every `TICK_MS` (default: 3s)
   - Maintains limited position history per flight

2. **REST API**
   - `GET /health` → Health check  
   - `GET /flights` → Current snapshot of all flights  

3. **WebSocket (Socket.io)**
   - Event: `"flights"` → emitted every tick with updated flight list  
   - On connect → client immediately receives current flights  

---

## ⚙️ Config (via `.env`)

PORT=5000 # server port
TICK_MS=3000 # update interval in ms
CORS_ORIGIN=* # frontend origin allowed
FLIGHT_COUNT=8 # number of flights simulated