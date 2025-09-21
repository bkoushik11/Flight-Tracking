import { useState, useEffect, useCallback, useRef } from 'react';
import { Flight, Alert, RestrictedZone } from '../types/flight';
import { flightService } from '../services/flightService';
import { io, Socket } from 'socket.io-client';

interface UseFlightsOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const useFlights = (options: UseFlightsOptions = {}) => {
  const { refreshInterval = 5000, autoRefresh = true } = options;
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<RestrictedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const updateBufferRef = useRef<Flight[] | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const fetchFlights = useCallback(async (filters?: {
    minAltitude?: number;
    maxAltitude?: number;
    statuses?: string[];
  }) => {
    try {
      setError(null);
      const response = await flightService.getFlights(filters);
      const sanitized = response.flights
        .map(flight => ({
          ...flight,
          // Coerce numeric fields that may arrive as strings
          latitude: typeof flight.latitude === 'string' ? Number(flight.latitude) : flight.latitude,
          longitude: typeof flight.longitude === 'string' ? Number(flight.longitude) : flight.longitude,
          altitude: typeof flight.altitude === 'string' ? Number(flight.altitude) : flight.altitude,
          speed: typeof flight.speed === 'string' ? Number(flight.speed) : flight.speed,
          heading: typeof flight.heading === 'string' ? Number(flight.heading) : flight.heading,
          lastUpdate: new Date(flight.lastUpdate)
        }))
        // Drop any flights with invalid coordinates
        .filter(f => Number.isFinite(f.latitude) && Number.isFinite(f.longitude));

      setFlights(sanitized);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flights');
      console.error('Error fetching flights:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const alertsData = await flightService.getAlerts();
      setAlerts(alertsData.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp)
      })));
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }, []);

  const fetchRestrictedZones = useCallback(async () => {
    try {
      const zones = await flightService.getRestrictedZones();
      setRestrictedZones(zones);
    } catch (err) {
      console.error('Error fetching restricted zones:', err);
    }
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await flightService.dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  const refreshData = useCallback(async (filters?: {
    minAltitude?: number;
    maxAltitude?: number;
    statuses?: string[];
  }) => {
    await Promise.all([
      fetchFlights(filters),
      fetchAlerts()
    ]);
  }, [fetchFlights, fetchAlerts]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Kick off initial fetches immediately for faster first paint
        await Promise.all([
          fetchFlights(),
          fetchAlerts(),
          fetchRestrictedZones()
        ]);

        // In background, ensure sufficient flights exist, then refresh once
        (async () => {
          try {
            const count = await flightService.getCount();
            if (count < 80) {
              await flightService.seed(80);
              await fetchFlights();
            }
          } catch {}
        })();
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchFlights, fetchAlerts, fetchRestrictedZones]);

  // Auto-refresh flights
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchFlights();
      fetchAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchFlights, fetchAlerts, refreshInterval, autoRefresh]);

  // Socket.IO real-time updates with improved connection handling
  useEffect(() => {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
    const url = baseUrl.replace(/\/$/, '');
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    
    const socket = io(url, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelayMax: 10000,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });
    
    socketRef.current = socket;

    const applyBufferedUpdate = () => {
      if (!updateBufferRef.current) return;
      const flights = updateBufferRef.current;
      updateBufferRef.current = null;
      setFlights(flights.map(f => ({
        ...f,
        lastUpdate: new Date((f as any).lastUpdate || Date.now())
      })));
      setLastUpdate(new Date());
    };

    socket.on('connect', () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      setError(null);
      socket.emit('request_flights');
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        setError('Server disconnected. Please refresh the page.');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setError('Connection failed. Retrying...');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttempts = attemptNumber;
      console.log(`Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`);
      setError(`Reconnecting... (${attemptNumber}/${maxReconnectAttempts})`);
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setError('Connection lost. Please refresh the page.');
    });

    let lastUpdateMs = 0;
    socket.on('flights', (raw: any[]) => {
      try {
        // Map backend flight shape to frontend
        const mapped: Flight[] = raw.map((f: any) => ({
          id: String(f.id),
          flightNumber: String(f.flightNumber || f.id || 'FL-000'),
          latitude: Number(f.lat ?? f.latitude ?? 0),
          longitude: Number(f.lng ?? f.longitude ?? 0),
          altitude: Number(f.altitude ?? 0),
          speed: Number(f.speed ?? 0),
          heading: Number(f.heading ?? 0),
          status: String(f.status || 'on-time').replace(' ', '-') as any,
          aircraft: String(f.aircraft || 'Unknown'),
          origin: String(f.origin || 'N/A'),
          destination: String(f.destination || 'N/A'),
          lastUpdate: new Date(f.updatedAt ?? Date.now()),
          path: Array.isArray(f.history) ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number]) : [],
        }));

        updateBufferRef.current = mapped;
        
        // Throttle updates to prevent excessive re-renders
        const now = Date.now();
        if (now - lastUpdateMs > 300) {
          if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = window.setTimeout(() => {
            lastUpdateMs = Date.now();
            applyBufferedUpdate();
          }, 100);
        }
      } catch (error) {
        console.error('Error processing flight data:', error);
      }
    });

    // Handle real-time alerts
    socket.on('alerts', (newAlerts: any[]) => {
      try {
        const mappedAlerts: Alert[] = newAlerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
        
        setAlerts(prev => {
          // Add new alerts, avoiding duplicates
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewAlerts = mappedAlerts.filter(a => !existingIds.has(a.id));
          return [...uniqueNewAlerts, ...prev];
        });
      } catch (error) {
        console.error('Error processing alerts:', error);
      }
    });

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      socket.disconnect();
    };
  }, []);

  return {
    flights,
    alerts,
    restrictedZones,
    loading,
    error,
    lastUpdate,
    refreshData,
    dismissAlert,
    fetchFlights
  };
};