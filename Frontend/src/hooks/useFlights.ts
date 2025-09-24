import { useState, useEffect, useCallback, useRef } from 'react';
import { Flight } from '../types/flight';
import { flightService } from '../services/flightService';
import { io, Socket } from 'socket.io-client';

export const useFlights = () => {
  // Auto-refresh disabled to keep flights static
  
  const [flights, setFlights] = useState<Flight[]>([]);
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

  



  

  const refreshData = useCallback(async (filters?: {
    minAltitude?: number;
    maxAltitude?: number;
    statuses?: string[];
  }) => {
    await fetchFlights(filters);
  }, [fetchFlights]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await fetchFlights();
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchFlights]);

  // Auto-refresh flights - DISABLED to keep existing flights static
  // useEffect(() => {
  //   if (!autoRefresh) return;

  //   const interval = setInterval(() => {
  //     fetchFlights();
  //   }, refreshInterval);

  //   return () => clearInterval(interval);
  // }, [fetchFlights, refreshInterval, autoRefresh]);

  // Socket.IO real-time updates with improved connection handling
  useEffect(() => {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    // Remove /api from the end for socket connection
    const socketUrl = baseUrl.replace('/api', '');
    const maxReconnectAttempts = 10;
    
    console.log('🔌 Connecting to backend socket at:', socketUrl);
    
    const socket = io(socketUrl, {
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
      setFlights(flights.map((f: any) => ({
        ...f,
        lastUpdate: new Date((f as any).lastUpdate || Date.now())
      })));
      setLastUpdate(new Date());
    };

    socket.on('connect', () => {
      console.log('✅ Socket connected to backend!');
      setError(null);
      socket.emit('request_flights');
    });

    socket.on('disconnect', (reason: any) => {
      console.log('❌ Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        setError('Server disconnected. Please refresh the page.');
      }
    });

    socket.on('connect_error', (error: any) => {
      console.log('🔴 Socket connection error:', error);
      setError('Connection failed. Retrying...');
    });

    socket.on('reconnect_attempt', (attemptNumber: any) => {
      console.log(`🔄 Reconnect attempt ${attemptNumber}/${maxReconnectAttempts}`);
      setError(`Reconnecting... (${attemptNumber}/${maxReconnectAttempts})`);
    });

    socket.on('reconnect_failed', () => {
      console.log('💥 Reconnection failed');
      setError('Connection lost. Please refresh the page.');
    });

    let lastUpdateMs = 0;
    socket.on('flights', (raw: any[]) => {
      try {
        console.log('✈️ Received flights from backend:', raw.length, 'flights');
        
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

        console.log('✅ Mapped flights:', mapped.length, 'valid flights');
        if (mapped.length > 0) {
          console.log('First flight sample:', {
            id: mapped[0].id,
            flightNumber: mapped[0].flightNumber,
            lat: mapped[0].latitude,
            lng: mapped[0].longitude,
            altitude: mapped[0].altitude
          });
        }

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
        // Silent error handling for flight data processing
      }
    });

    // Handle real-time alerts - functionality removed and cleaned up
    // socket.on('alerts', (newAlerts: any[]) => {

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      socket.disconnect();
    };
  }, []);

  return {
    flights,
    loading,
    error,
    lastUpdate,
    refreshData,
    fetchFlights
  };
};