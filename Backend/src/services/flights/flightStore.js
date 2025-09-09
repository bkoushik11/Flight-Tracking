const { randomUUID } = require("crypto");
const { GEOGRAPHIC_BOUNDS } = require("../../utils/constants");

class FlightStore {
  constructor() {
    this.flights = new Map();
    this.statuses = ["on-time", "delayed", "landed", "lost comm"];
    this.maxHistoryLength = 50;
    
    // Indian airports and cities for realistic flight data
    this.airports = [
      { code: "DEL", name: "Delhi", city: "New Delhi", lat: 28.5562, lng: 77.1000 },
      { code: "BOM", name: "Mumbai", city: "Mumbai", lat: 19.0896, lng: 72.8656 },
      { code: "BLR", name: "Bangalore", city: "Bangalore", lat: 12.9716, lng: 77.5946 },
      { code: "MAA", name: "Chennai", city: "Chennai", lat: 13.0827, lng: 80.2707 },
      { code: "HYD", name: "Hyderabad", city: "Hyderabad", lat: 17.2403, lng: 78.4294 },
      { code: "CCU", name: "Kolkata", city: "Kolkata", lat: 22.6547, lng: 88.4467 },
      { code: "AMD", name: "Ahmedabad", city: "Ahmedabad", lat: 23.0772, lng: 72.6347 },
      { code: "PNQ", name: "Pune", city: "Pune", lat: 18.5821, lng: 73.9197 },
      { code: "COK", name: "Kochi", city: "Kochi", lat: 10.1520, lng: 76.4019 },
      { code: "GOI", name: "Goa", city: "Goa", lat: 15.3808, lng: 73.8314 },
      { code: "JAI", name: "Jaipur", city: "Jaipur", lat: 26.8242, lng: 75.8011 },
      { code: "LKO", name: "Lucknow", city: "Lucknow", lat: 26.7606, lng: 80.8893 }
    ];
    
    this.aircraftTypes = [
      "Boeing 737-800", "Airbus A320", "Boeing 777-300ER", "Airbus A321",
      "Boeing 787-9", "Airbus A330-300", "Boeing 737 MAX", "Airbus A350-900",
      "Embraer E190", "ATR 72-600", "Bombardier CRJ-900", "Boeing 747-400"
    ];
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  _calculateHeading(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360; // Normalize to 0-360
  }

  _newFlight() {
    // Select random origin and destination airports
    const originAirport = this.airports[Math.floor(Math.random() * this.airports.length)];
    let destinationAirport;
    do {
      destinationAirport = this.airports[Math.floor(Math.random() * this.airports.length)];
    } while (destinationAirport.code === originAirport.code); // Ensure different origin/destination

    // Generate flight number with airline codes
    const airlines = ["AI", "6E", "SG", "G8", "IX", "UK"];
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = `${airline}${Math.floor(100 + Math.random() * 900)}`;

    // Calculate initial position (somewhere between origin and destination)
    const progress = this._rand(0.1, 0.9); // 10% to 90% of the way
    const lat = originAirport.lat + (destinationAirport.lat - originAirport.lat) * progress;
    const lng = originAirport.lng + (destinationAirport.lng - originAirport.lng) * progress;

    // Calculate heading towards destination
    const heading = this._calculateHeading(lat, lng, destinationAirport.lat, destinationAirport.lng);

    return {
      id: randomUUID().slice(0, 8),
      flightNumber,
      lat,
      lng,
      altitude: Math.floor(this._rand(10000, 38000)), // ft
      speed: Math.floor(this._rand(220, 520)),        // kts
      heading: Math.floor(heading),
      status: this.statuses[Math.floor(this._rand(0, this.statuses.length))],
      aircraft: this.aircraftTypes[Math.floor(Math.random() * this.aircraftTypes.length)],
      origin: `${originAirport.code} - ${originAirport.city}`,
      destination: `${destinationAirport.code} - ${destinationAirport.city}`,
      originAirport,
      destinationAirport,
      updatedAt: Date.now(),
      history: [{ lat, lng, ts: Date.now() }]
    };
  }

  seedFlights(count = 8) {
    this.flights.clear();
    for (let i = 0; i < count; i++) {
      const flight = this._newFlight();
      this.flights.set(flight.id, flight);
    }
    return this.getAllFlights();
  }

  getAllFlights() {
    return Array.from(this.flights.values());
  }

  getFlight(id) {
    return this.flights.get(id);
  }

  updateFlight(id, updates) {
    const flight = this.flights.get(id);
    if (!flight) return null;

    Object.assign(flight, updates);
    flight.updatedAt = Date.now();
    
    // Add to history if position changed
    if (updates.lat || updates.lng) {
      flight.history.push({ 
        lat: flight.lat, 
        lng: flight.lng, 
        ts: flight.updatedAt 
      });
      
      // Trim history
      if (flight.history.length > this.maxHistoryLength) {
        flight.history.shift();
      }
    }

    return flight;
  }

  reset() {
    this.flights.clear();
    return this.seedFlights();
  }

  getCount() {
    return this.flights.size;
  }
}

module.exports = new FlightStore();
