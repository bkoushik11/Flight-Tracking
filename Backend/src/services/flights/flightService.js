const axios = require('axios');
const { GEOGRAPHIC_BOUNDS, CONFIG } = require("../../utils/constants");

// OpenSky API configuration - using anonymous access only
const OPENSKY_API_BASE = 'https://opensky-network.org/api/states/all';
const API_TIMEOUT = 1500000; // 15 seconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration
const MIN_REQUEST_INTERVAL = 15000; // 5 minutes minimum request interval

// India geographic boundaries
const INDIA_BOUNDS = {
  lamin: 6.4627, // Southern boundary (near Kanyakumari)
  lomin: 68.1097, // Western boundary (near Gujarat)
  lamax: 37.0841, // Northern boundary (near Kashmir)
  lomax: 97.3956  // Eastern boundary (near Arunachal Pradesh)
};

class FlightService {
  constructor() {
    this.updateStats = {
      totalUpdates: 0,
      lastUpdate: null,
      averageUpdateTime: 0
    };
    this.flightCache = new Map();
    // Maintain rolling last-50 positions per flight id
    this.flightHistories = new Map();
    this.lastFetchTime = 0;
    this.cacheDuration = CACHE_DURATION;
    this.rateLimitBackoff = 0; // Track rate limit backoff
    
    
    console.log(`Latitude: ${INDIA_BOUNDS.lamin}° to ${INDIA_BOUNDS.lamax}°`);
    console.log(`Longitude: ${INDIA_BOUNDS.lomin}° to ${INDIA_BOUNDS.lomax}°`);
    console.log(`Maximum flights: ${CONFIG.FLIGHT_COUNT} (limited to 2 live flights)`);
  }

  async getAllFlights() {
    try {
      const currentTime = Date.now();
      
      // Always check cache first - return cached data if the last request was too recent
      if (currentTime - this.lastFetchTime < MIN_REQUEST_INTERVAL) {
        if (this.flightCache.size > 0) {
          return Array.from(this.flightCache.values());
        }
        return [];
      }
      
      // Check if we're in rate limit backoff period
      if (this.rateLimitBackoff > currentTime) {
        // Always return cached data during backoff period if available
        if (this.flightCache.size > 0) {
          return Array.from(this.flightCache.values());
        }
        return [];
      }
      
      // Use cache if data is recent (but not too recent as checked above)
      if (currentTime - this.lastFetchTime < this.cacheDuration && this.flightCache.size > 0) {
        return Array.from(this.flightCache.values());
      }

    
      const flights = await this._fetchFromOpenSkyAPI();

      // Update rolling histories per flight and stamp history onto objects
      const nowTs = Date.now();
      flights.forEach(f => {
        const id = String(f.id);
        const position = { lat: f.lat, lng: f.lng, alt: f.altitude, ts: nowTs };
        if (!this.flightHistories.has(id)) {
          this.flightHistories.set(id, []);
        }
        const arr = this.flightHistories.get(id);
        arr.push(position);
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500);
        }
        // attach copy of history to response object
        f.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
      });
      
      // Reset rate limit backoff on successful request
      this.rateLimitBackoff = 0;
      
      // Update cache
      this.flightCache.clear();
      flights.forEach(flight => this.flightCache.set(flight.id, flight));
      this.lastFetchTime = currentTime;
      
      this._updateStats(currentTime);
      if (flights.length > 0) {
        console.log(`Fetched and processed ${flights.length} flights from OpenSky API`);
      }
      return flights;
      
    } catch (error) {
      console.error("Error in getAllFlights:", error.message);
      
      // Handle rate limiting with exponential backoff
      if (error.message.includes('rate limit') || error.response?.status === 429) {
        const currentTime = Date.now();
        
        // Set initial backoff to 5 minutes
        this.rateLimitBackoff = currentTime + (5 * 60 * 1000);
        console.log(`Rate limited. Backing off for 5 minutes until ${new Date(this.rateLimitBackoff).toLocaleTimeString()}`);
      }
      
      // Return cached data if available during errors, even if it's stale
      if (this.flightCache.size > 0) {
        return Array.from(this.flightCache.values());
      }
      
      // Return empty array if no cache available
      return [];
    }
  }

  async _fetchFromOpenSkyAPI() {
    // India bounding box params
    const params = new URLSearchParams({
      lamin: INDIA_BOUNDS.lamin.toString(),
      lomin: INDIA_BOUNDS.lomin.toString(),
      lamax: INDIA_BOUNDS.lamax.toString(),
      lomax: INDIA_BOUNDS.lomax.toString()
    });

    const url = `${OPENSKY_API_BASE}?${params.toString()}`;
    const config = {
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'Flight-Tracker-App/1.0'
      }
    };

    try {
      console.log('Making anonymous request to OpenSky API...');
      const response = await axios.get(url, config);

      if (!response.data?.states) {
        throw new Error('Invalid response from OpenSky API.');
      }

      // Transform to internal flight format and limit
      const flights = this._transformOpenSkyData(response.data.states).slice(0, CONFIG.FLIGHT_COUNT);
      
      return flights;

    } catch (error) {
      console.error("Error fetching from OpenSky API:", error.message);
      
      // Log additional details for debugging
      if (error.response) {
        console.error("   Status:", error.response.status);
        console.error("   Status Text:", error.response.statusText);
        console.error("   Headers:", JSON.stringify(error.response.headers, null, 2));
      }

      throw error;
    }
  }
  
  _transformOpenSkyData(states) {
    const validFlights = [];
    
    if (!Array.isArray(states)) {
      console.warn('⚠️  Invalid states data received from OpenSky API');
      return validFlights;
    }
    
    states.forEach((state, index) => {
      try {
        // OpenSky state vector format based on official documentation:
        // [0]icao24, [1]callsign, [2]origin_country, [3]time_position, [4]last_contact,
        // [5]longitude, [6]latitude, [7]baro_altitude, [8]on_ground, [9]velocity,
        // [10]true_track, [11]vertical_rate, [12]sensors, [13]geo_altitude, [14]squawk, [15]spi, [16]position_source
        
        const [
          icao24, callsign, origin_country, time_position, last_contact,
          longitude, latitude, baro_altitude, on_ground, velocity,
          true_track,geo_altitude
        ] = state;
        
        // Skip aircraft without valid position data or on ground
        if (!latitude || !longitude || on_ground) {
          return;
        }
        
        // Skip aircraft with missing essential data
        if (!icao24 || latitude === null || longitude === null) {
          return;
        }
        
        // Convert and validate data
        const lat = Number(latitude);
        const lng = Number(longitude);
        const alt = baro_altitude ? Number(baro_altitude) : (geo_altitude ? Number(geo_altitude) : 0);
        const speed = velocity ? Number(velocity) * 1.944 : 0; // Convert m/s to knots
        const heading = true_track ? Number(true_track) : 0;
        
        // Skip invalid coordinates
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || 
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return;
        }
        
        // Double-check that flight is within India boundaries (API filtering might not be perfect)
        if (lat < INDIA_BOUNDS.lamin || lat > INDIA_BOUNDS.lamax || 
            lng < INDIA_BOUNDS.lomin || lng > INDIA_BOUNDS.lomax) {
          return;
        }
        
        // Clean callsign
        const flightNumber = callsign ? callsign.trim() : `FL${icao24.slice(-4).toUpperCase()}`;
        
        // // Determine status based on speed and altitude
        // let status = 'on-time';
        // if (speed < 50 && alt < 10000) {
        //   status = 'boarding';
        // } else if (speed < 200) {
        //   status = 'delayed';
        // }
        
        validFlights.push({
          id: icao24,
          flightNumber: flightNumber,
          lat: lat,
          lng: lng,
          altitude: Math.max(0, alt * 3.28084), // Convert meters to feet
          speed: Math.max(0, speed),
          heading: heading,
          aircraft: 'Unknown', // OpenSky doesn't provide aircraft type in basic API
          origin: origin_country || 'Unknown',
          destination: 'Unknown', // Would need additional API calls
          updatedAt: (last_contact || time_position || Date.now() / 1000) * 1000,
          history: []
        });
        
      } catch (error) {
        // Skip invalid entries silently
        console.warn(`Skipping invalid flight data at index ${index}:`, error.message);
      }
    });
    
    // Sort by most recent update time and limit to 2 flights
    const sortedFlights = validFlights.sort((a, b) => b.updatedAt - a.updatedAt);
    const limitedFlights = sortedFlights.slice(0, 2);
    
    console.log(`📊 Filtered ${validFlights.length} valid flights to ${limitedFlights.length} live flights`);
    if (limitedFlights.length > 0) {
      console.log('Live flights:', limitedFlights.map(f => ({ 
        id: f.id, 
        flightNumber: f.flightNumber, 
        lat: f.lat, 
        lng: f.lng,
        updatedAt: new Date(f.updatedAt).toISOString()
      })));
    }
    
    return limitedFlights;
  }

  async getFlight(id) {
    if (!id) {
      throw new Error("Flight ID is required");
    }
    
    try {
      // Check cache first
      if (this.flightCache.has(id)) {
        return this.flightCache.get(id);
      }
      
      // Always fetch fresh data for individual flight requests if not in cache
      const flights = await this.getAllFlights();
      const flight = flights.find(flight => flight.id === id) || null;
      
      // Update the flight history
      if (flight) {
        const nowTs = Date.now();
        const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
        if (!this.flightHistories.has(id)) {
          this.flightHistories.set(id, []);
        }
        const arr = this.flightHistories.get(id);
        arr.push(position);
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500);
        }
        // attach copy of history to response object
        flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
      }
      
      return flight;
    } catch (error) {
      console.error(`Error getting flight ${id}:`, error);
      return null;
    }
  }

  async seedFlights(count = null) {
    return await this.getAllFlights();
  }

  async resetFlights() {
    try {
      console.log("Clearing flight cache and forcing fresh OpenSky API fetch");
      this.flightCache.clear();
      this.lastFetchTime = 0;
      this.rateLimitBackoff = 0;
      return await this.getAllFlights();
    } catch (error) {
      console.error("Error resetting flights:", error);
      throw error;
    }
  }

  // Add a method to manually clear rate limit backoff
  clearRateLimitBackoff() {
    console.log("Manually clearing rate limit backoff");
    this.rateLimitBackoff = 0;
  }

  // Add a method to force refresh flights
  async forceRefreshFlights() {
    console.log("Force refreshing flights - clearing cache and backoff");
    this.flightCache.clear();
    this.lastFetchTime = 0;
    this.rateLimitBackoff = 0;
    return await this.getAllFlights();
  }

  async updateFlightPositions() {
    // Force refresh from OpenSky API
    this.lastFetchTime = 0;
    return await this.getAllFlights();
  }

  _updateStats(startTime) {
    const updateTime = Date.now() - startTime;
    this.updateStats.totalUpdates++;
    this.updateStats.lastUpdate = new Date();
    this.updateStats.averageUpdateTime = 
      (this.updateStats.averageUpdateTime * (this.updateStats.totalUpdates - 1) + updateTime) / 
      this.updateStats.totalUpdates;
  }

  getFlightCount() {
    try {
      return this.flightCache.size;
    } catch (error) {
      console.error("Error getting flight count:", error);
      return 0;
    }
  }

  getStats() {
    return {
      ...this.updateStats,
      totalFlights: this.getFlightCount(),
      cacheSize: this.flightCache.size,
      lastFetchTime: new Date(this.lastFetchTime),
      usingOpenSkyAPI: true,
      hasValidCredentials: false, // Always false for anonymous access
      rateLimitBackoff: this.rateLimitBackoff,
      isInBackoff: this.rateLimitBackoff > Date.now(),
      backoffEndTime: this.rateLimitBackoff ? new Date(this.rateLimitBackoff) : null,
      backoffTimeLeft: this.rateLimitBackoff > Date.now() ? 
        Math.ceil((this.rateLimitBackoff - Date.now()) / 1000) : 0
    };
  }
}

// Export the instance and the class
const flightServiceInstance = new FlightService();
module.exports = flightServiceInstance;
module.exports.FlightService = FlightService;