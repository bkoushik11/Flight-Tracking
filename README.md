# 🛩️ Flight Tracker

A real-time flight tracking application that simulates aircraft movements and provides live monitoring capabilities with an interactive map interface.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running Locally](#running-locally)
- [Configuration](#configuration)
- [Usage](#usage)

## 🎯 Overview

Flight Tracker is a full-stack application that simulates real-time aircraft tracking. It features:

- **Real-time Flight Simulation**: Generates and updates flight data every 3 seconds
- **Interactive Map**: Visualize flights on a map with Leaflet/React-Leaflet
- **Live Updates**: WebSocket-based real-time communication
- **Flight Filtering**: Filter by altitude, status, and other criteria
- **Alert System**: Monitor restricted zones and flight anomalies
- **Responsive UI**: Modern interface built with React and Tailwind CSS

## ✨ Features

### Backend Features
- RESTful API for flight data management
- WebSocket server for real-time updates
- Flight simulation engine with configurable parameters
- Geographic bounds (India region simulation)
- Flight status management (on-time, delayed, landed, lost communication)


### Frontend Features
- Interactive map with flight markers
- Real-time flight position updates
- Flight filtering and search
- Alert notifications system
- Responsive design
- Connection status monitoring

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- ** Socket.IO ** - Real-time communication
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware
- **dotenv** - Environment configuration

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Leaflet** - Interactive maps
- **React-Leaflet** - React integration for Leaflet
- **Socket.IO Client** - Real-time communication

## 📁 Project Structure

```
Flight tracking/
├── Backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── sockets/         # WebSocket handlers
│   │   ├── utils/           # Utilities and constants
│   │   ├── app.js           # Express app configuration
│   │   └── index.js         # Server entry point
│   ├── package.json
│   └── README.md
├── Frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # App entry point
│   ├── package.json
│   └── README.md
└── README.md
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- A modern web browser

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <https://github.com/bkoushik11/Flight-Tracking.git>
cd "Flight tracking"
```

### 2. Install Backend Dependencies

```bash
cd Backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../Frontend
npm install
```

## 🏃‍♂️ Running Locally

### Run Both Services Separately

#### Start the Backend Server

```bash
cd Backend
npm run dev
```

The backend will start on `http://localhost:5000`

#### Start the Frontend Development Server

```bash
cd Frontend
npm run dev
```

The frontend will start on `http://localhost:5173`


### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the Backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Flight Simulation
TICK_MS=3000
FLIGHT_COUNT=200

# CORS
CORS_ORIGIN=*
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend server port |
| `TICK_MS` | 3000 | Flight update interval (ms) |
| `FLIGHT_COUNT` | 40 | Number of simulated flights |
| `CORS_ORIGIN` | * | Allowed CORS origins |

## 🎮 Usage

### Using the Flight Tracker

1. **View Flights**: Open the application to see all simulated flights on the map
2. **Filter Flights**: Use the filter panel to filter by altitude or status
3. **Monitor Alerts**: Check the alerts panel for system notifications
4. **Flight Details**: Click on any flight marker to view detailed information
5. **Real-time Updates**: Watch flights move in real-time as they update every 3 seconds

### Flight Statuses

- **On Time**: Normal operation
- **Delayed**: Flight experiencing delays
- **Landed**: Flight has completed its journey
- **Lost Comm**: Communication lost with aircraft

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 5000
   npx kill-port 5000
   ```

2. **CORS Issues**
   - Ensure `CORS_ORIGIN` is set correctly in `.env`
   - Check that frontend URL matches allowed origins

3. **WebSocket Connection Issues**
   - Verify backend is running on correct port
   - Check browser console for connection errors

4. **Map Not Loading**
   - Ensure internet connection for Leaflet tiles
   - Check browser console for map-related errors

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy Tracking! 🛩️**
