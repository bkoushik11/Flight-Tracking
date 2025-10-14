import { useState, useEffect, useCallback, useRef } from 'react';
import { Flight } from '../types/flight';
import { flightService } from '../services/flightService';
import { io, Socket } from 'socket.io-client';

export const useFlights = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const hasReceivedInitialDataRef = useRef(false);
  const pathsRef = useRef<Map<string, [number, number][]>>(new Map());

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
          heading: typeof flight.heading === 'string' ? Number(flight.heading) : flight.heading
        }))
        // Drop any flights with invalid coordinates
        .filter(f => Number.isFinite(f.latitude) && Number.isFinite(f.longitude));
        // Removed strict altitude and speed filtering to show all flights

      // Always replace flights on fetch (initial load or manual refresh)
      setFlights(sanitized);
      setLastUpdate(new Date());
      hasReceivedInitialDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flights');
      console.error('Error fetching flights:', err);
    }
  }, []);

  // Function to check if flight data has significant changes
  const hasSignificantChanges = useCallback((prevFlight: Flight, nextFlight: Flight) => {
    // Tolerances tuned to reduce jitter while keeping motion realistic
    const latTolerance = 0.005; // ~5 meters
    const lngTolerance = 0.005; // ~5 meters
    const altTolerance = 10;      // 10 feet
    const speedTolerance = 5;     // 5 knots
    const headingTolerance = 1;   // 1 degree

    return (
      Math.abs(prevFlight.latitude - nextFlight.latitude) > latTolerance ||
      Math.abs(prevFlight.longitude - nextFlight.longitude) > lngTolerance ||
      Math.abs(prevFlight.altitude - nextFlight.altitude) > altTolerance ||
      Math.abs(prevFlight.speed - nextFlight.speed) > speedTolerance ||
      Math.abs(prevFlight.heading - nextFlight.heading) > headingTolerance ||
      
      prevFlight.flightNumber !== nextFlight.flightNumber
    );
  }, []);

  const applyBufferedUpdate = useCallback(() => {
    // No-op after simplification
    return;
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
          aircraft: String(f.aircraft || 'Unknown'),
          origin: String(f.origin || 'N/A'),
          destination: String(f.destination || 'N/A'),
          lastUpdate: new Date(f.updatedAt ?? Date.now()),
          path: Array.isArray(f.history) ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number]) : [],
        }));

        // Always update flights from WebSocket - prioritize real-time data
        setFlights(mapped);
        setLastUpdate(new Date());
        hasReceivedInitialDataRef.current = true;
      } catch (error) {
        // Silent error handling for flight data processing
        console.error('Error processing flight data:', error);
      }
    });

    return () => {
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