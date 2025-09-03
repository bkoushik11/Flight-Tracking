# Flight Tracker Frontend

This frontend is a **React-based web app** (scaffolded via Lovable or Bolt) that visualizes live flight data on a map.  
It consumes the backend REST + WebSocket APIs to display flight positions, metadata, and alerts in real time.

---

## ⚡️ Tech Stack

- **React** (from Lovable/Bolt scaffold) → UI framework  
- **Leaflet.js** (with React-Leaflet) → Map rendering  
- **TailwindCSS** → UI styling and layout  
- **socket.io-client** → Real-time updates from backend  
- **Vite** (or Next.js, depending on scaffold) → Dev build system  

---

## 🌍 Features

1. **Map Interface**
   - Displays flights as markers/icons using Leaflet  
   - Flight path history is shown as polylines  
   - Restricted zones can be drawn as polygons  

2. **Flight Metadata**
   - Flight ID / Number  
   - Latitude / Longitude  
   - Altitude  
   - Speed  
   - Heading  
   - Status (on-time, delayed, landed, lost comm)  

3. **Real-time Updates**
   - Initial fetch via REST (`/flights`)  
   - Subsequent updates streamed via WebSocket (`"flights"` event)  
   - UI updates without full reload  

4. **Filters & Alerts**
   - Filter by altitude, speed, or status  
   - Alerts if a flight enters restricted zone or loses communication  
   - Search by flight number  

---

## 🔌 API Integration

- **REST API**  
  `GET ${VITE_API_URL}/flights`  
  → Returns current snapshot of all flights  

- **WebSocket (Socket.io)**  
  Connect to `${VITE_API_URL}`  
  → Listen for `"flights"` event with updated list  

---

## 📦 Flight Object Schema

The frontend consumes this JSON shape from backend:

```json
{
  "id": "a1b2c3d4",
  "flightNumber": "FL-203",
  "lat": 22.54,
  "lng": 78.12,
  "altitude": 32000,
  "speed": 480,
  "heading": 145,
  "status": "on-time",
  "updatedAt": 1695678912345,
  "history": [
    { "lat": 22.53, "lng": 78.10, "ts": 1695678890000 },
    { "lat": 22.54, "lng": 78.12, "ts": 1695678912345 }
  ]
}
