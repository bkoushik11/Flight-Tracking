import { httpGet, httpPost, httpDelete } from '../shared/lib/http';
import type { Alert, RestrictedZone, Flight } from '../types/flight';

export interface FlightApiResponse {
  flights: any[];
  total: number;
  page: number;
  limit: number;
}

// Local in-memory mocks for alerts since backend doesn't expose these endpoints
let localAlerts: Alert[] = [];

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

    // Client-side filtering
    const filtered = flights.filter((f) => {
      const minOk = params?.minAltitude !== undefined ? f.altitude >= params.minAltitude : true;
      const maxOk = params?.maxAltitude !== undefined ? f.altitude <= params.maxAltitude : true;
      const statusOk = params?.statuses && params.statuses.length > 0 ? params.statuses.includes(f.status) : true;
      return minOk && maxOk && statusOk;
    });

    const total = Array.isArray(raw) ? filtered.length : (typeof raw?.total === 'number' ? raw.total : filtered.length);
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return { flights: paged, total, page, limit };
  }

  async getFlightById(id: string): Promise<Flight> {
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
  }

  async getCount(): Promise<number> {
    const res = await httpGet<{ count: number }>(`/flights/count`);
    return res.count;
  }

  async seed(count: number): Promise<void> {
    await httpPost(`/flights/seed`, { count });
  }

  async getRestrictedZones(): Promise<RestrictedZone[]> {
    try {
      return await httpGet<RestrictedZone[]>('/alerts/zones');
    } catch (error) {
      console.error('Error fetching restricted zones:', error);
      // Fallback to empty array if backend is not available
      return [];
    }
  }

  async getAlerts(): Promise<Alert[]> {
    try {
      const alerts = await httpGet<Alert[]>('/alerts');
      return alerts.map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp)
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return localAlerts;
    }
  }

  async dismissAlert(alertId: string): Promise<{ ok: true }> {
    try {
      await httpDelete(`/alerts/${alertId}`);
      return { ok: true };
    } catch (error) {
      console.error('Error dismissing alert:', error);
      // Fallback to local removal
      localAlerts = localAlerts.filter((a) => a.id !== alertId);
      return { ok: true };
    }
  }

  // Helper for components to add alerts (e.g., from map zone violations)
  addAlert(alert: Alert) {
    localAlerts = [alert, ...localAlerts];
  }
}

export const flightService = new FlightService();