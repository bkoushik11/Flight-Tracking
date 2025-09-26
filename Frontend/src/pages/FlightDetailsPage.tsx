import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flight } from '../types/flight';
import { ArrowLeft, Activity, Compass as CompassIcon } from 'lucide-react';
import RadarDisplay from '../components/RadarDisplay';
import ControlButtons from '../components/ControlButtons';
import Compass from '../components/Compass';
import { flightService } from '../services/flightService';
import { recordingService } from '../services/recordingService';
import AuthService from '../services/authService';
import { io, Socket } from 'socket.io-client';
import FlightHistoryPanel from '../components/FlightHistoryPanel';
import FlightStatusPanel from '../components/FlightStatusPanel';

interface FlightDetailsPageProps {
  flight: Flight;
  onBack: () => void;
}

interface CoordinateHistory {
  lat: number;
  lng: number;
  altitude: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface LiveMetrics {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalSpeed: number;
  groundSpeed: number;
}

export const FlightDetailsPage: React.FC<FlightDetailsPageProps> = ({ flight, onBack }) => {
  // State Management
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [radarRotation, setRadarRotation] = useState(0);
  const [systemStatus] = useState<'ONLINE' | 'OFFLINE' | 'MAINTENANCE'>('ONLINE');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [flightHistory, setFlightHistory] = useState<CoordinateHistory[]>([]);
  const [realFlightData, setRealFlightData] = useState<Flight | null>(null);
  
  // WebSocket reference
  const socketRef = useRef<Socket | null>(null);
  
  // Radar animation states
  const [sweepAngle, setSweepAngle] = useState(0);
  const radarSweepRef = useRef<number | null>(null);
  
  // Live flight metrics with real-time simulation
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>(() => {
    const currentFlight = flight; // Always use the passed flight prop for initial state
    return {
      latitude: currentFlight.latitude || 34.0522,
      longitude: currentFlight.longitude || -118.2437,
      altitude: currentFlight.altitude || 19815,
      speed: currentFlight.speed || 450,
      heading: currentFlight.heading || 275,
      verticalSpeed: 0,
      groundSpeed: currentFlight.speed || 450
    };
  });
  
  // Log when liveMetrics changes
  useEffect(() => {
    console.log('📊 Live metrics updated:', liveMetrics);
  }, [liveMetrics]);
  
  // Coordinate history for tracking
  const [coordinateHistory, setCoordinateHistory] = useState<CoordinateHistory[]>([]);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = baseUrl.replace('/api', '');
    
    console.log('🔌 Connecting to backend socket for flight details at:', socketUrl);
    console.log('🎯 Subscribing to flight ID:', flight.id);
    
    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 10000,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected to backend for flight details!');
      // Subscribe to updates for this specific flight
      socket.emit('subscribe_flight', { id: flight.id });
    });

    socket.on('disconnect', (reason: any) => {
      console.log('❌ Socket disconnected for flight details:', reason);
    });

    socket.on('connect_error', (error: any) => {
      console.log('🔴 Socket connection error for flight details:', error);
    });

    // Handle real-time flight updates
    socket.on('flight', (updatedFlight: any) => {
      try {
        console.log('✈️ Received real-time update for flight:', {
          id: updatedFlight.id,
          flightNumber: updatedFlight.flightNumber,
          lat: updatedFlight.lat,
          lng: updatedFlight.lng,
          altitude: updatedFlight.altitude,
          speed: updatedFlight.speed,
          heading: updatedFlight.heading,
          updatedAt: new Date(updatedFlight.updatedAt)
        });
        
        // Verify this update is for the correct flight
        if (updatedFlight.id !== flight.id) {
          console.log('⚠️ Received update for different flight, ignoring:', updatedFlight.id);
          return;
        }
        
        // Map backend flight shape to frontend
        const mappedFlight: Flight = {
          id: String(updatedFlight.id),
          flightNumber: String(updatedFlight.flightNumber || updatedFlight.id || 'FL-000'),
          latitude: Number(updatedFlight.lat ?? updatedFlight.latitude ?? 0),
          longitude: Number(updatedFlight.lng ?? updatedFlight.longitude ?? 0),
          altitude: Number(updatedFlight.altitude ?? 0),
          speed: Number(updatedFlight.speed ?? 0),
          heading: Number(updatedFlight.heading ?? 0),
          status: String(updatedFlight.status || 'on-time').replace(' ', '-') as any,
          aircraft: String(updatedFlight.aircraft || 'Unknown'),
          origin: String(updatedFlight.origin || 'N/A'),
          destination: String(updatedFlight.destination || 'N/A'),
          lastUpdate: new Date(updatedFlight.updatedAt ?? Date.now()),
          path: Array.isArray(updatedFlight.history) 
            ? updatedFlight.history.map((h: any) => [Number(h.lat), Number(h.lng)] as [number, number]) 
            : [],
        };

        // Update the real flight data
        setRealFlightData(mappedFlight);
        
        // Update live metrics
        setLiveMetrics({
          latitude: mappedFlight.latitude,
          longitude: mappedFlight.longitude,
          altitude: mappedFlight.altitude,
          speed: mappedFlight.speed,
          heading: mappedFlight.heading,
          verticalSpeed: 0,
          groundSpeed: mappedFlight.speed
        });
        
        // Update last update timestamp
        setLastUpdate(Date.now());
        
        // Add to flight history only when position changes
        const newPoint: CoordinateHistory = {
          lat: mappedFlight.latitude,
          lng: mappedFlight.longitude,
          altitude: mappedFlight.altitude,
          timestamp: Date.now(),
          speed: mappedFlight.speed,
          heading: mappedFlight.heading
        };

        // Update history only when position changes significantly
        setFlightHistory(prev => {
          const last = prev[0];
          
          // If no previous history, add the new point
          if (!last) {
            return [newPoint];
          }
          
          // Check if position has changed significantly
          const isSame = Math.abs(last.lat - newPoint.lat) < 1e-7 && Math.abs(last.lng - newPoint.lng) < 1e-7;
          const hasMoved = Math.abs(last.lat - newPoint.lat) > 1e-4 || Math.abs(last.lng - newPoint.lng) > 1e-4;
          const shouldUpdate = !isSame || hasMoved;
          
          if (shouldUpdate) {
            const next = [newPoint, ...prev];
            return next.length > 50 ? next.slice(0, 50) : next;
          }
          return prev;
        });

        setCoordinateHistory(prev => {
          const last = prev[0];
          
          // If no previous history, add the new point
          if (!last) {
            return [newPoint];
          }
          
          // Check if position has changed significantly
          const isSame = Math.abs(last.lat - newPoint.lat) < 1e-7 && Math.abs(last.lng - newPoint.lng) < 1e-7;
          const hasMoved = Math.abs(last.lat - newPoint.lat) > 1e-4 || Math.abs(last.lng - newPoint.lng) > 1e-4;
          const shouldUpdate = !isSame || hasMoved;
          
          if (shouldUpdate) {
            const next = [newPoint, ...prev].slice(0, 2);
            return next;
          }
          return prev;
        });
        
        console.log('✅ Flight data updated successfully at:', new Date().toISOString());
      } catch (error) {
        console.error('Error processing flight update:', error);
      }
    });

    // Handle errors
    socket.on('error', (error: any) => {
      console.log('🔴 Socket error for flight details:', error);
    });

    // Request periodic updates every 10 seconds to ensure we get updates even if WebSocket misses some
    const updateInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        console.log('🔄 Requesting flight update for:', flight.id);
        socketRef.current.emit('subscribe_flight', { id: flight.id });
      }
    }, 10000);

    return () => {
      // Clear the interval
      clearInterval(updateInterval);
      
      // Unsubscribe from flight updates
      if (socketRef.current) {
        console.log('📤 Unsubscribing from flight:', flight.id);
        socketRef.current.emit('unsubscribe_flight', { id: flight.id });
        socketRef.current.disconnect();
      }
    };
  }, [flight.id]);

  // Fetch real flight data from backend (which uses OpenSky API) and seed initial history
  useEffect(() => {
    const fetchRealFlightData = async () => {
      try {
        // Always force refresh for initial data load
        const realData = await flightService.getFlightById(flight.id, { refresh: true });
        if (realData) {
          console.log('🛫 Initial flight data loaded:', {
            id: realData.id,
            flightNumber: realData.flightNumber,
            lat: realData.latitude,
            lng: realData.longitude,
            altitude: realData.altitude,
            speed: realData.speed,
            heading: realData.heading
          });
          
          setRealFlightData(realData);
          setLiveMetrics({
            latitude: realData.latitude || flight.latitude || 34.0522,
            longitude: realData.longitude || flight.longitude || -118.2437,
            altitude: realData.altitude || flight.altitude || 19815,
            speed: realData.speed || flight.speed || 450,
            heading: realData.heading || flight.heading || 275,
            verticalSpeed: 0,
            groundSpeed: realData.speed || flight.speed || 450
          });
          
          // Create new point for history
          const newPoint: CoordinateHistory = {
            lat: realData.latitude || 0,
            lng: realData.longitude || 0,
            altitude: realData.altitude || 0,
            timestamp: Date.now(),
            speed: realData.speed,
            heading: realData.heading
          };

          // Update history only when position changes significantly
          setFlightHistory(prev => {
            const last = prev[0];
            
            // If no previous history, add the new point
            if (!last) {
              return [newPoint];
            }
            
            // Check if position has changed significantly
            const isSame = Math.abs(last.lat - newPoint.lat) < 1e-7 && Math.abs(last.lng - newPoint.lng) < 1e-7;
            const hasMoved = Math.abs(last.lat - newPoint.lat) > 1e-4 || Math.abs(last.lng - newPoint.lng) > 1e-4;
            const shouldUpdate = !isSame || hasMoved;
            
            if (shouldUpdate) {
              const next = [newPoint, ...prev];
              return next.length > 50 ? next.slice(0, 50) : next;
            }
            return prev;
          });
          
          setCoordinateHistory(prev => {
            const last = prev[0];
            
            // If no previous history, add the new point
            if (!last) {
              return [newPoint];
            }
            
            // Check if position has changed significantly
            const isSame = Math.abs(last.lat - newPoint.lat) < 1e-7 && Math.abs(last.lng - newPoint.lng) < 1e-7;
            const hasMoved = Math.abs(last.lat - newPoint.lat) > 1e-4 || Math.abs(last.lng - newPoint.lng) > 1e-4;
            const shouldUpdate = !isSame || hasMoved;
            
            if (shouldUpdate) {
              const next = [newPoint, ...prev].slice(0, 2);
              return next;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching real flight data:', error);
      }
    };

    fetchRealFlightData();
    
    // The WebSocket connection will handle real-time updates
    // This initial fetch just provides immediate data while WebSocket connects
  }, [flight.id]);

  // Poll backend for the selected flight and maintain last 50 positions
  // DEPRECATED: Now using WebSocket for real-time updates

  // Smooth radar sweep animation - runs continuously with smooth 360 rotation
  useEffect(() => {
    let previousTimestamp: number | null = null;
    
    const animateRadarSweep = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }
      
      // Calculate delta time for consistent speed regardless of frame rate
      const deltaTime = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      
      // Adjust speed based on frame rate (targeting 60fps)
      const speedFactor = deltaTime / (1000 / 60);
      const increment = 2 * speedFactor;
      
      setSweepAngle(prev => {
        const newAngle = prev + increment;
        // Instead of using modulo which causes jumps, we let it accumulate
        // and only reset when it's significantly large to avoid precision issues
        return newAngle > 100000 ? newAngle - 100000 : newAngle;
      });
      
      radarSweepRef.current = requestAnimationFrame(animateRadarSweep);
    };
    
    radarSweepRef.current = requestAnimationFrame(animateRadarSweep);
    
    return () => {
      if (radarSweepRef.current) {
        cancelAnimationFrame(radarSweepRef.current);
      }
    };
  }, []);

  // Utility functions
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  const formatAltitude = useCallback((alt: number) => {
    return `${alt.toLocaleString()} FT`;
  }, []);

  const formatSpeed = useCallback((speed: number) => {
    return `${Math.round(speed)} KTS`;
  }, []);

  // Handle show full history toggle
  const handleShowFullHistory = useCallback(() => {
    setShowFullHistory(prev => !prev);
  }, []);

  // Control handlers
  const handleRecordToggle = useCallback(async () => {
    if (!isRecording) {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
        const options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9,opus' } as any;
        const mediaRecorder = new MediaRecorder(stream, options);
        recordedChunksRef.current = [];
        recordStartRef.current = Date.now();
        mediaRecorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const durationMs = recordStartRef.current ? Date.now() - recordStartRef.current : undefined;
            if (!AuthService.isAuthenticated()) return;
            setUploading(true);
            await recordingService.uploadRecording(blob, {
              title: `${(realFlightData || flight).flightNumber || 'Flight'}-${new Date().toISOString()}`,
              flightId: (flight as any).id || (realFlightData as any)?.id,
              flightNumber: (realFlightData || flight).flightNumber,
              durationMs
            });
            setUploadSuccess('Recording saved successfully');
          } catch (err) {
            console.error('Upload error:', err);
          } finally {
            setUploading(false);
          }
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        // UI history addition
        setCoordinateHistory(prevHistory => [
          {
            lat: liveMetrics.latitude,
            lng: liveMetrics.longitude,
            altitude: liveMetrics.altitude,
            timestamp: Date.now(),
            speed: liveMetrics.speed,
            heading: liveMetrics.heading
          },
          ...prevHistory.slice(0, 1)
        ]);
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start recording:', e);
      }
    } else {
      try {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      } catch {}
      setIsRecording(false);
    }
  }, [isRecording, liveMetrics, realFlightData, flight]);

  const handleRotateMap = useCallback(() => {
    const rotationSteps = [0, 45, 90, 135, 180, 225, 270, 315];
    const currentIndex = rotationSteps.indexOf(radarRotation);
    const nextIndex = (currentIndex + 1) % rotationSteps.length;
    setRadarRotation(rotationSteps[nextIndex]);
  }, [radarRotation]);

  // Handle north button (reset to north/0 degrees like Google Maps)
  const handleResetToNorth = useCallback(() => {
    setRadarRotation(0);
  }, []);

  // Status indicator component
  const StatusIndicator: React.FC<{ status: string; color: string }> = ({ status, color }) => (
    <div className="flex items-center gap-2">
      <div 
        className="w-2 h-2 rounded-full animate-pulse" 
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium" style={{ color }}>
        {status}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden">
      {/* Custom scrollbar styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
      
      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-20">
        <div 
          className="absolute inset-0 bg-grid-pattern animate-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 200, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 200, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={onBack}
          className="group p-3 rounded-xl transition-all duration-300 bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-400/30 hover:border-cyan-400/60 backdrop-blur-md shadow-lg hover:shadow-cyan-400/20"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-3 mb-3 px-6 py-3 rounded-2xl bg-slate-900/60 border border-cyan-400/30 backdrop-blur-md">
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent tracking-wider">
                {realFlightData?.flightNumber || flight.flightNumber || 'LNI080'}
              </h1>
            </div>
            <p className="text-cyan-300/80 font-mono text-lg tracking-wide">
              {realFlightData?.origin || flight.origin || 'Indonesia'} → {realFlightData?.destination || flight.destination || 'Unknown'}
            </p>
            <div className="mt-2 text-xs text-slate-400 font-mono uppercase tracking-widest">
              REAL-TIME AVIATION RADAR
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Left Panel - Previous Coordinates */}
            <div className="xl:col-span-3 order-2 xl:order-1">
              <FlightHistoryPanel
                showFullHistory={showFullHistory}
                flightHistory={flightHistory}
                coordinateHistory={coordinateHistory}
                onToggleHistory={handleShowFullHistory}
                formatTime={formatTime}
              />
            </div>

            {/* Center Panel - Radar Display */}
            <div className="xl:col-span-6 order-1 xl:order-2 flex flex-col items-center space-y-4">
              {/* Radar Container */}
              <div className="relative flex flex-col items-center">
                <RadarDisplay 
                  sweepAngle={sweepAngle} 
                  radarRotation={radarRotation} 
                  flightNumber={realFlightData?.flightNumber || flight.flightNumber || '747'} 
                  headingAngle={liveMetrics.heading}
                />
                

              </div>

              {/* Control Buttons */}
              <div className="w-full flex justify-center gap-4">
                <ControlButtons
                  isRecording={isRecording}
                  onRecordToggle={handleRecordToggle}
                  onRotateMap={handleRotateMap}
               
                />
              </div>
              {uploading && (
                <div className="text-sm text-cyan-300">Uploading recording...</div>
              )}
              {uploadSuccess && (
                <div className="text-sm text-green-400">{uploadSuccess}</div>
              )}

              {/* Compass Component */}
              <Compass 
                radarRotation={radarRotation} 
                onResetToNorth={handleResetToNorth} 
              />
            </div>

            {/* Right Panel - Current Location & Status */}
            <div className="xl:col-span-3 order-3">
              <FlightStatusPanel
                liveMetrics={liveMetrics}
                realFlightData={realFlightData}
                flight={flight}
                lastUpdate={lastUpdate}
                systemStatus={systemStatus}
                radarRotation={radarRotation}
                formatTime={formatTime}
                formatAltitude={formatAltitude}
                formatSpeed={formatSpeed}
              />
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="mt-4 bg-slate-900/40 backdrop-blur-xl border border-green-400/20 rounded-2xl p-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm uppercase tracking-wide">System Status:</span>
                  <StatusIndicator status={systemStatus} color="#10B981" />
                </div>
                <div className="flex items-center gap-2">
                  <CompassIcon className="w-4 h-4 text-green-400 transition-transform duration-300 ease-in-out" style={{ transform: `rotate(${radarRotation}deg)` }} />
                  <span className="text-green-400 text-sm font-mono">Radar: {radarRotation}°</span>
                </div>
              </div>
              <div className="text-slate-400 text-sm font-mono">
                {new Date().toLocaleDateString()} • {formatTime(Date.now())}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};