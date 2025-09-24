import { httpGet } from '../shared/lib/http';
import type { Flight } from '../types/flight';

export interface FlightApiResponse {
  flights: any[];
  total: number;
  page: number;
  limit: number;
}

// Local storage for flight data caching
let flightCache: Flight[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

export class FlightService {
  async getFlights(params?: {
    minAltitude?: number;
    maxAltitude?: number;
    statuses?: string[];
    page?: number;
    limit?: number;
  }): Promise<FlightApiResponse> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? Number.MAX_SAFE_INTEGER;

    // Check cache first
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION && flightCache.length > 0) {
      const filtered = this.applyFilters(flightCache, params);
      return this.paginateResults(filtered, page, limit);
    }

    try {
      // Backend may return array or object { flights, total, page, limit }
      const raw = await httpGet<any>(`/flights`);
      const rawFlights: any[] = Array.isArray(raw) ? raw : (raw?.flights ?? []);

      // Map backend -> frontend flight shape
      const flights: Flight[] = rawFlights.map((f) => {
        const status = String(f.status || 'on-time').replace(' ', '-');
        const path = Array.isArray(f.history)
          ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number])
          : [];
        return {
          id: String(f.id),
          flightNumber: String(f.flightNumber || f.id || 'FL-000'),
          latitude: Number(f.lat ?? f.latitude ?? 0),
          longitude: Number(f.lng ?? f.longitude ?? 0),
          altitude: Number(f.altitude ?? 0),
          speed: Number(f.speed ?? 0),
          heading: Number(f.heading ?? 0),
          status: status as any,
          aircraft: String(f.aircraft || 'Unknown'),
          origin: String(f.origin || 'N/A'),
          destination: String(f.destination || 'N/A'),
          lastUpdate: new Date(f.updatedAt ?? Date.now()),
          path,
        };
      });

      // Update cache
      flightCache = flights;
      lastFetchTime = now;

      // Apply filters and pagination
      const filtered = this.applyFilters(flights, params);
      return this.paginateResults(filtered, page, limit);
    } catch (error) {
      console.error('Error fetching flights:', error);
      // Return cached data if available
      if (flightCache.length > 0) {
        const filtered = this.applyFilters(flightCache, params);
        return this.paginateResults(filtered, page, limit);
      }
      return { flights: [], total: 0, page, limit };
    }
  }

  private applyFilters(flights: Flight[], params?: {
    minAltitude?: number;
    maxAltitude?: number;
    statuses?: string[];
  }): Flight[] {
    return flights.filter((f) => {
      const minOk = params?.minAltitude !== undefined ? f.altitude >= params.minAltitude : true;
      const maxOk = params?.maxAltitude !== undefined ? f.altitude <= params.maxAltitude : true;
      const statusOk = params?.statuses && params.statuses.length > 0 ? params.statuses.includes(f.status) : true;
      return minOk && maxOk && statusOk;
    });
  }

  private paginateResults(flights: Flight[], page: number, limit: number): FlightApiResponse {
    const start = (page - 1) * limit;
    const paged = flights.slice(start, start + limit);
    return { flights: paged, total: flights.length, page, limit };
  }

  async getFlightById(id: string): Promise<Flight | null> {
    try {
      // Check cache first
      const cachedFlight = flightCache.find(f => f.id === id);
      if (cachedFlight) {
        return cachedFlight;
      }

      // Fetch from API
      const f = await httpGet<any>(`/flights/${id}`);
      const status = String(f.status || 'on-time').replace(' ', '-');
      const path = Array.isArray(f.history)
        ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number])
        : [];
      return {
        id: String(f.id),
        flightNumber: String(f.flightNumber || f.id || 'FL-000'),
        latitude: Number(f.lat ?? f.latitude ?? 0),
        longitude: Number(f.lng ?? f.longitude ?? 0),
        altitude: Number(f.altitude ?? 0),
        speed: Number(f.speed ?? 0),
        heading: Number(f.heading ?? 0),
        status: status as any,
        aircraft: String(f.aircraft || 'Unknown'),
        origin: String(f.origin || 'N/A'),
        destination: String(f.destination || 'N/A'),
        lastUpdate: new Date(f.updatedAt ?? Date.now()),
        path,
      };
    } catch (error) {
      console.error('Error fetching flight by ID:', error);
      return null;
    }
  }

  async getCount(): Promise<number> {
    try {
      const res = await httpGet<{ count: number }>(`/flights/count`);
      return res.count;
    } catch (error) {
      console.error('Error fetching flight count:', error);
      return flightCache.length;
    }
  }

  async refreshData(): Promise<void> {
    // Force refresh by clearing cache
    flightCache = [];
    lastFetchTime = 0;
  }
}

export const flightService = new FlightService();