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
  const updateBufferRef = useRef<Flight[] | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isUpdatingRef = useRef(false);
  const hasReceivedInitialDataRef = useRef(false);
  const pathsRef = useRef<Map<string, [number, number][]>>(new Map());
  const previousFlightsRef = useRef<Map<string, Flight>>(new Map());

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

      setFlights(prevFlights => {
        // Use diff-based update instead of full replacement
        let hasChanges = false;

        // Map new flights by ID
        const newFlightsMap = new Map(sanitized.map(f => [f.id, f]));

        // Update existing flights only if significant changes
        const updatedFlights = prevFlights.map(prevFlight => {
          const newFlight = newFlightsMap.get(prevFlight.id);
          if (!newFlight) return prevFlight; // flight disappeared

          if (hasSignificantChanges(prevFlight, newFlight)) {
            hasChanges = true;
            
            // Update path tracking
            if (!pathsRef.current.has(newFlight.id)) {
              pathsRef.current.set(newFlight.id, newFlight.path || []);
            } else {
              const existing = pathsRef.current.get(newFlight.id)!;
              // Only add new point if position changed significantly
              if (existing.length === 0 || 
                  Math.abs(existing[existing.length - 1][0] - newFlight.latitude) > 0.000005 ||
                  Math.abs(existing[existing.length - 1][1] - newFlight.longitude) > 0.000005) {
                existing.push([newFlight.latitude, newFlight.longitude]);
              }
            }
            newFlight.path = pathsRef.current.get(newFlight.id)!;
            
            return newFlight;
          }
          return prevFlight;
        });

        // Add any brand new flights
        const trulyNewFlights = sanitized.filter(
          f => !prevFlights.some(pf => pf.id === f.id)
        );
        if (trulyNewFlights.length > 0) {
          hasChanges = true;
          trulyNewFlights.forEach(f => {
            // Initialize path for new flight
            if (!pathsRef.current.has(f.id)) {
              pathsRef.current.set(f.id, f.path || []);
            }
            f.path = pathsRef.current.get(f.id)!;
          });
          updatedFlights.push(...trulyNewFlights);
        }

        // Update the previous flights reference
        if (hasChanges) {
          const updatedFlightsMap = new Map(updatedFlights.map(f => [f.id, f]));
          previousFlightsRef.current = updatedFlightsMap;
        }

        return hasChanges ? updatedFlights : prevFlights;
      });
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
    const latTolerance = 0.00005; // ~5 meters
    const lngTolerance = 0.00005; // ~5 meters
    const altTolerance = 20;      // 20 feet
    const speedTolerance = 5;     // 5 knots
    const headingTolerance = 2;   // 2 degrees

    return (
      Math.abs(prevFlight.latitude - nextFlight.latitude) > latTolerance ||
      Math.abs(prevFlight.longitude - nextFlight.longitude) > lngTolerance ||
      Math.abs(prevFlight.altitude - nextFlight.altitude) > altTolerance ||
      Math.abs(prevFlight.speed - nextFlight.speed) > speedTolerance ||
      Math.abs(prevFlight.heading - nextFlight.heading) > headingTolerance ||
      prevFlight.status !== nextFlight.status ||
      prevFlight.flightNumber !== nextFlight.flightNumber
    );
  }, []);

  const applyBufferedUpdate = useCallback(() => {
    if (!updateBufferRef.current || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    try {
      const newFlights = updateBufferRef.current;
      updateBufferRef.current = null;
      
      // Only update if we have actual data and it's different from current
      if (newFlights.length > 0) {
        setFlights(prevFlights => {
          // Use diff-based update instead of full replacement
          let hasChanges = false;

          // Map new flights by ID
          const newFlightsMap = new Map(newFlights.map(f => [f.id, f]));

          // Update existing flights only if significant changes
          const updatedFlights = prevFlights.map(prevFlight => {
            const newFlight = newFlightsMap.get(prevFlight.id);
            if (!newFlight) return prevFlight; // flight disappeared

            if (hasSignificantChanges(prevFlight, newFlight)) {
              hasChanges = true;
              
              // Update path tracking
              if (!pathsRef.current.has(newFlight.id)) {
                pathsRef.current.set(newFlight.id, newFlight.path || []);
              } else {
                const existing = pathsRef.current.get(newFlight.id)!;
                // Only add new point if position changed significantly
                if (existing.length === 0 || 
                    Math.abs(existing[existing.length - 1][0] - newFlight.latitude) > 0.00005 ||
                    Math.abs(existing[existing.length - 1][1] - newFlight.longitude) > 0.00005) {
                  existing.push([newFlight.latitude, newFlight.longitude]);
                }
              }
              newFlight.path = pathsRef.current.get(newFlight.id)!;
              
              return newFlight;
            }
            return prevFlight;
          });

          // Add any brand new flights
          const trulyNewFlights = newFlights.filter(
            f => !prevFlights.some(pf => pf.id === f.id)
          );
          if (trulyNewFlights.length > 0) {
            hasChanges = true;
            trulyNewFlights.forEach(f => {
              // Initialize path for new flight
              if (!pathsRef.current.has(f.id)) {
                pathsRef.current.set(f.id, f.path || []);
              }
              f.path = pathsRef.current.get(f.id)!;
            });
            updatedFlights.push(...trulyNewFlights);
          }

          // Remove disappeared flights
          const disappearedFlights = prevFlights.filter(
            pf => !newFlights.some(f => f.id === pf.id)
          );
          if (disappearedFlights.length > 0) {
            hasChanges = true;
            disappearedFlights.forEach(f => {
              // Clean up path tracking for disappeared flights
              pathsRef.current.delete(f.id);
            });
          }

          // Update the previous flights reference
          if (hasChanges) {
            const updatedFlightsMap = new Map(updatedFlights.map(f => [f.id, f]));
            previousFlightsRef.current = updatedFlightsMap;
            console.log('🔄 Updating flights with significant changes');
            setLastUpdate(new Date());
            return updatedFlights;
          }
          
          // No significant changes, return previous state to prevent re-render
          console.log('⏭️ Skipping update - no significant changes detected');
          return prevFlights;
        });
      }
    } catch (error) {
      console.error('Error applying flight updates:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [hasSignificantChanges]);

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
          status: String(f.status || 'on-time') as any,
          aircraft: String(f.aircraft || 'Unknown'),
          origin: String(f.origin || 'N/A'),
          destination: String(f.destination || 'N/A'),
          lastUpdate: new Date(f.updatedAt ?? Date.now()),
          path: Array.isArray(f.history) ? f.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number]) : [],
        }));
        
        console.log('✅ Mapped flights:', mapped.length, 'valid flights');

        updateBufferRef.current = mapped;
        
        // Apply updates with debounce
        if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = window.setTimeout(() => {
          applyBufferedUpdate();
        }, 700); // Further smooth updates to reduce map churn
        
        hasReceivedInitialDataRef.current = true;
      } catch (error) {
        // Silent error handling for flight data processing
        console.error('Error processing flight data:', error);
      }
    });

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      socket.disconnect();
    };
  }, [applyBufferedUpdate]);

  return {
    flights,
    loading,
    error,
    lastUpdate,
    refreshData,
    fetchFlights
  };
};