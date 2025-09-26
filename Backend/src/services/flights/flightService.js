const axios = require('axios');
const { GEOGRAPHIC_BOUNDS } = require("../../utils/constants");

// OpenSky API configuration based on official documentation
const OPENSKY_API_BASE = 'https://opensky-network.org/api';
const OPENSKY_AUTH_BASE = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const API_TIMEOUT = 15000; // 15 seconds
const CACHE_DURATION = 10000; // Set to 10 seconds to match update interval
const MIN_REQUEST_INTERVAL = 10000; // Set to 10 seconds to match update interval

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
    this.accessToken = null; // Store OAuth2 access token
    this.tokenExpiry = 0; // Track token expiration
    
    // Validate OpenSky API credentials
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      console.warn('⚠️  OpenSky API credentials not found in .env file');
      console.warn('   Using anonymous access (400 requests/day, 10s intervals)');
    } else {
      console.log('✅ OpenSky API credentials configured for OAuth2');
      console.log(`   Client ID: ${process.env.CLIENT_ID}`);
      console.log('   Using authenticated access (4000+ requests/day, 5s intervals)');
    }
    
    console.log('🇮🇳 Configured for India flights only');
    console.log(`   Latitude: ${INDIA_BOUNDS.lamin}° to ${INDIA_BOUNDS.lamax}°`);
    console.log(`   Longitude: ${INDIA_BOUNDS.lomin}° to ${INDIA_BOUNDS.lomax}°`);
    console.log('   Maximum flights: 100');
  }

  async _getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }
      
      if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
        return null; // No credentials, use anonymous access
      }
      
      console.log('Obtaining OAuth2 access token...');
      
      const response = await axios.post(OPENSKY_AUTH_BASE, new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET
      }), {
        timeout: API_TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Token expires in 30 minutes according to docs, set expiry 5 minutes earlier
        this.tokenExpiry = Date.now() + (25 * 60 * 1000);
        console.log('✅ OAuth2 token obtained successfully');
        return this.accessToken;
      } else {
        throw new Error('Invalid token response');
      }
      
    } catch (error) {
      console.error('OAuth2 token error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Clear invalid token
      this.accessToken = null;
      this.tokenExpiry = 0;
      
      return null; // Fall back to anonymous access
    }
  }

  async getAllFlights() {
    try {
      const currentTime = Date.now();
      
      // Enforce minimum request interval to prevent rate limiting
      const timeSinceLastRequest = currentTime - this.lastFetchTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        console.log(`Rate limiting: Using cached data. Next request in ${Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000)}s`);
        if (this.flightCache.size > 0) {
          return Array.from(this.flightCache.values());
        }
        return [];
      }
      
      // Check if we're in rate limit backoff period
      if (this.rateLimitBackoff > currentTime) {
        console.log(`Rate limit backoff active until ${new Date(this.rateLimitBackoff).toLocaleTimeString()}`);
        if (this.flightCache.size > 0) {
          return Array.from(this.flightCache.values());
        }
        return [];
      }
      
      // Use cache if data is recent
      if (currentTime - this.lastFetchTime < this.cacheDuration && this.flightCache.size > 0) {
        console.log(`Using cached flight data (${this.flightCache.size} flights)`);
        return Array.from(this.flightCache.values());
      }

      console.log('📡 Fetching real flight data from OpenSky API...');
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
        if (arr.length > 50) {
          arr.splice(0, arr.length - 50);
        }
        // attach copy of history to response object
        f.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
      });
      
      // Reset rate limit backoff on successful request
      this.rateLimitBackoff = 0;
      
      if (flights.length === 0) {
        console.warn('No flights returned from OpenSky API');
      }
      
      // Update cache
      this.flightCache.clear();
      flights.forEach(flight => this.flightCache.set(flight.id, flight));
      this.lastFetchTime = currentTime;
      
      this._updateStats(currentTime);
      console.log(`✅ Fetched and processed ${flights.length} flights from OpenSky API`);
      return flights;
      
    } catch (error) {
      console.error("Error in getAllFlights:", error.message);
      
      // Handle rate limiting with exponential backoff
      if (error.message.includes('rate limit')) {
        // Set backoff to 10 minutes for rate limiting
        this.rateLimitBackoff = Date.now() + (10 * 60 * 1000);
        console.log(`Rate limited. Backing off for 10 minutes until ${new Date(this.rateLimitBackoff).toLocaleTimeString()}`);
      }
      
      // Return cached data if available during errors
      if (this.flightCache.size > 0) {
        console.log('Returning cached data due to API error');
        return Array.from(this.flightCache.values());
      }
      
      // Return empty array if no cache available
      return [];
    }
  }

  async _fetchFromOpenSkyAPI() {
    try {
      // OpenSky API endpoint with India bounding box parameters
      const params = new URLSearchParams({
        lamin: INDIA_BOUNDS.lamin.toString(),
        lomin: INDIA_BOUNDS.lomin.toString(),
        lamax: INDIA_BOUNDS.lamax.toString(),
        lomax: INDIA_BOUNDS.lomax.toString()
      });
      
      const url = `${OPENSKY_API_BASE}/states/all?${params.toString()}`;
      
      // Prepare configuration
      const config = {
        timeout: API_TIMEOUT,
        headers: {
          'User-Agent': 'Flight-Tracker-App/1.0'
        }
      };
      
      // Try to get OAuth2 token
      const token = await this._getAccessToken();
      
      if (token) {
        // Use OAuth2 Bearer token authentication
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('Making authenticated request to OpenSky API for India flights...');
      } else {
        console.log('Making anonymous request to OpenSky API for India flights...');
      }
      
      const response = await axios.get(url, config);
      
      if (!response.data || !response.data.states) {
        throw new Error('Invalid response format from OpenSky API');
      }
      
      const states = response.data.states;
      console.log(`Received ${states.length} aircraft from India region`);
      
      // Transform OpenSky data to our flight format and limit to 100 flights
      const flights = this._transformOpenSkyData(states).slice(0, 100);
      
      console.log(`Processed ${flights.length} valid flights (limited to 100)`);
      return flights;
      
    } catch (error) {
      console.error('OpenSky API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('OpenSky API request timeout');
      } else if (error.response?.status === 429) {
        throw new Error('OpenSky API rate limit exceeded - please wait before retrying');
      } else if (error.response?.status === 401) {
        throw new Error('OpenSky API authentication failed - using anonymous access');
      } else {
        throw new Error(`OpenSky API error: ${error.message}`);
      }
    }
  }
  
  _transformOpenSkyData(states) {
    const validFlights = [];
    
    states.forEach((state, index) => {
      try {
        // OpenSky state vector format based on official documentation:
        // [0]icao24, [1]callsign, [2]origin_country, [3]time_position, [4]last_contact,
        // [5]longitude, [6]latitude, [7]baro_altitude, [8]on_ground, [9]velocity,
        // [10]true_track, [11]vertical_rate, [12]sensors, [13]geo_altitude, [14]squawk, [15]spi, [16]position_source
        
        const [
          icao24, callsign, origin_country, time_position, last_contact,
          longitude, latitude, baro_altitude, on_ground, velocity,
          true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source
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
        
        // Determine status based on speed and altitude
        let status = 'on-time';
        if (speed < 50 && alt < 1000) {
          status = 'boarding';
        } else if (speed < 100) {
          status = 'delayed';
        }
        
        validFlights.push({
          id: icao24,
          flightNumber: flightNumber,
          lat: lat,
          lng: lng,
          altitude: Math.max(0, alt * 3.28084), // Convert meters to feet
          speed: Math.max(0, speed),
          heading: heading,
          status: status,
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
    
    return validFlights;
  }

  async getFlight(id) {
    if (!id) {
      throw new Error("Flight ID is required");
    }
    
    try {
      console.log(`🔍 Looking for flight ${id} in cache...`);
      // Check cache first
      if (this.flightCache.has(id)) {
        const cachedFlight = this.flightCache.get(id);
        console.log(`✅ Found flight ${id} in cache`);
        return cachedFlight;
      }
      
      console.log(`🔄 Flight ${id} not in cache, fetching fresh data...`);
      // Always fetch fresh data for individual flight requests if not in cache
      const flights = await this.getAllFlights();
      const flight = flights.find(flight => flight.id === id) || null;
      
      // Update the flight history
      if (flight) {
        console.log(`✅ Found flight ${id} in fresh data`);
        const nowTs = Date.now();
        const position = { lat: flight.lat, lng: flight.lng, alt: flight.altitude, ts: nowTs };
        if (!this.flightHistories.has(id)) {
          this.flightHistories.set(id, []);
        }
        const arr = this.flightHistories.get(id);
        arr.push(position);
        if (arr.length > 50) {
          arr.splice(0, arr.length - 50);
        }
        // attach copy of history to response object
        flight.history = arr.map(p => ({ lat: p.lat, lng: p.lng, ts: p.ts }));
      } else {
        console.log(`⚠️ Flight ${id} not found in fresh data`);
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
      this.accessToken = null;
      this.tokenExpiry = 0;
      return await this.getAllFlights();
    } catch (error) {
      console.error("Error resetting flights:", error);
      throw error;
    }
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
      hasValidCredentials: !!(process.env.CLIENT_ID && process.env.CLIENT_SECRET),
      rateLimitBackoff: this.rateLimitBackoff,
      tokenExpiry: this.tokenExpiry
    };
  }
}

// Export the instance and the class
const flightServiceInstance = new FlightService();
module.exports = flightServiceInstance;
module.exports.FlightService = FlightService;
