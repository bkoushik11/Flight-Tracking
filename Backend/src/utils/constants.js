// Flight status constants
const FLIGHT_STATUSES = {
  ON_TIME: "on-time",
  DELAYED: "delayed", 
  LANDED: "landed",
  LOST_COMM: "lost comm"
};

// Flight simulation constants
const FLIGHT_SIMULATION = {
  DEFAULT_COUNT: 2, // Limited to 2 live flights
  DEFAULT_TICK_MS: 3000,
  MAX_HISTORY_LENGTH: 50,
  POSITION_CHANGE_RANGE: 0.08,
  ALTITUDE_CHANGE_RANGE: 800,
  SPEED_CHANGE_RANGE: 20,
  HEADING_CHANGE_RANGE: 8,
  STATUS_CHANGE_PROBABILITY: {
    LOST_COMM: 0.01,
    DELAYED: 0.01,
    LANDED: 0.005
  }
};

// Geographic bounds (near India)
const GEOGRAPHIC_BOUNDS = {
  LAT_MIN: 8,
  LAT_MAX: 30,
  LNG_MIN: 68,
  LNG_MAX: 90,
  ALTITUDE_MIN: 0,
  ALTITUDE_MAX: 40000,
  SPEED_MIN: 140,
  SPEED_MAX: 560
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Socket events
const SOCKET_EVENTS = {
  FLIGHTS_UPDATE: "flights",
  FLIGHT_COUNT: "flight_count",
  SYSTEM_MESSAGE: "system_message",
  ERROR: "error",
  REQUEST_FLIGHTS: "request_flights",
  REQUEST_FLIGHT_COUNT: "request_flight_count"
};

module.exports = {
  FLIGHT_STATUSES,
  FLIGHT_SIMULATION,
  GEOGRAPHIC_BOUNDS,
  HTTP_STATUS,
  SOCKET_EVENTS,
  CONFIG: {
    PORT: Number(process.env.PORT) || 5000,
    TICK_MS: Number(process.env.TICK_MS) || 5000, // 5 seconds to reduce refresh frequency
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    FLIGHT_COUNT: Number(process.env.FLIGHT_COUNT)  || 200// Increased to 5 live flights
  }
};