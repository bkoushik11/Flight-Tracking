import { httpGet, httpPost, httpDelete } from '../shared/lib/http';
import type { Position } from '../components/PastTrackLayer';

export interface PositionsResponse {
  flightId: string;
  positions: Position[];
}

export async function fetchPositions(flightId: string): Promise<PositionsResponse> {
  return httpGet<PositionsResponse>(`/positions/default?flightId=${encodeURIComponent(flightId)}`);
}

export async function listRecordedFlightIds(): Promise<{ success: boolean; flightIds: string[] }> {
  return httpGet<{ success: boolean; flightIds: string[] }>(`/positions/recorded`);
}

export async function startRecording(flightId: string): Promise<{ success: boolean; message: string; flightId: string }> {
  return httpPost<{ success: boolean; message: string; flightId: string }>(`/positions/start`, { flightId });
}

export async function stopRecording(flightId: string): Promise<{ success: boolean; message: string; flightId: string }> {
  return httpPost<{ success: boolean; message: string; flightId: string }>(`/positions/stop`, { flightId });
}

export async function addRecordedPosition(payload: { flightId: string; latitude: number; longitude: number; heading?: number; altitude?: number; speed?: number }): Promise<any> {
  return httpPost<any>(`/positions/add`, payload);
}

export async function deleteRecordedFlight(flightId: string): Promise<{ success: boolean; deletedCount: number; flightId: string }> {
  return httpDelete<{ success: boolean; deletedCount: number; flightId: string }>(`/positions/${encodeURIComponent(flightId)}`);
}

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
const CACHE_DURATION = 10000; // Increased to 10 seconds to match backend update interval

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
      const filtered = this.applyFilters(flightCache);
      return this.paginateResults(filtered, page, limit);
    }

    try {
      console.log('📡 Fetching flights from backend API...');
      // Backend may return array or object { flights, total, page, limit }
      const raw = await httpGet<any>(`/flights`);
      console.log('📨 Raw API response:', raw);
      
      const rawFlights: any[] = Array.isArray(raw) ? raw : (raw?.flights ?? []);
      console.log('🛫 Raw flights count:', rawFlights.length);

      // Map backend -> frontend flight shape
      const flights: Flight[] = rawFlights.map((f) => {
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
          aircraft: String(f.aircraft || 'Unknown'),
          origin: String(f.origin || 'N/A'),
          destination: String(f.destination || 'N/A'),
          lastUpdate: new Date(f.updatedAt ?? Date.now()),
          path,
        };
      });

      console.log('✅ Processed flights:', flights.length);
      if (flights.length > 0) {
        console.log('Sample flight:', {
          id: flights[0].id,
          flightNumber: flights[0].flightNumber,
          lat: flights[0].latitude,
          lng: flights[0].longitude,
          heading: flights[0].heading
        });
      }

      // Update cache
      flightCache = flights;
      lastFetchTime = now;

      // Apply filters and pagination
      const filtered = this.applyFilters(flights);
      return this.paginateResults(filtered, page, limit);
    } catch (error) {
      console.error('Error fetching flights:', error);
      // Return cached data if available
      if (flightCache.length > 0) {
        const filtered = this.applyFilters(flightCache);
        return this.paginateResults(filtered, page, limit);
      }
      return { flights: [], total: 0, page, limit };
    }
  }

  private applyFilters(flights: Flight[]): Flight[] {
    // Return all flights without any filtering
    return flights;
  }

  private paginateResults(flights: Flight[], page: number, limit: number): FlightApiResponse {
    const start = (page - 1) * limit;
    const paged = flights.slice(start, start + limit);
    return { flights: paged, total: flights.length, page, limit };
  }

  async getFlightById(id: string, opts?: { refresh?: boolean }): Promise<Flight | null> {
    try {
      // Check cache first unless refresh explicitly requested
      if (!opts?.refresh) {
        const cachedFlight = flightCache.find(f => f.id === id);
        if (cachedFlight) {
          return cachedFlight;
        }
      }

      // Fetch from API
      const refreshQuery = opts?.refresh ? '?refresh=1' : '';
      const f = await httpGet<any>(`/flights/${id}${refreshQuery}`);
      const path = Array.isArray(f.history)
        ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number])
        : [];
      const mapped: Flight = {
        id: String(f.id),
        flightNumber: String(f.flightNumber || f.id || 'FL-000'),
        latitude: Number(f.lat ?? f.latitude ?? 0),
        longitude: Number(f.lng ?? f.longitude ?? 0),
        altitude: Number(f.altitude ?? 0),
        speed: Number(f.speed ?? 0),
        heading: Number(f.heading ?? 0),
        aircraft: String(f.aircraft || 'Unknown'),
        origin: String(f.origin || 'N/A'),
        destination: String(f.destination || 'N/A'),
        lastUpdate: new Date(f.updatedAt ?? Date.now()),
        path,
      };

      // Update cache entry for this flight
      const idx = flightCache.findIndex(fl => fl.id === mapped.id);
      if (idx >= 0) {
        flightCache[idx] = mapped;
      } else {
        flightCache.push(mapped);
      }

      return mapped;
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