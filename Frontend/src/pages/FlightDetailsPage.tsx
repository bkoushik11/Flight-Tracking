import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flight } from '../types/flight';
import { ArrowLeft, Activity, MapPin, Clock, Navigation, Gauge, History, Compass as CompassIcon } from 'lucide-react';
import RadarDisplay from '../components/RadarDisplay';
import CoordinatePanel from '../components/CoordinatePanel';
import ControlButtons from '../components/ControlButtons';
import Compass from '../components/Compass';
import { flightService } from '../services/flightService';

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
  const [radarRotation, setRadarRotation] = useState(0);
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'OFFLINE' | 'MAINTENANCE'>('ONLINE');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [flightHistory, setFlightHistory] = useState<CoordinateHistory[]>([]);
  const [realFlightData, setRealFlightData] = useState<Flight | null>(null);
  
  // Radar animation states
  const [sweepAngle, setSweepAngle] = useState(0);
  const radarSweepRef = useRef<number | null>(null);
  
  // Live flight metrics with real-time simulation
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>(() => {
    const currentFlight = realFlightData || flight;
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
  
  // Coordinate history for tracking
  const [coordinateHistory, setCoordinateHistory] = useState<CoordinateHistory[]>([
    {
      lat: 34.0522,
      lng: -118.2437,
      altitude: 15000,
      timestamp: Date.now() - 6 * 60 * 1000,
      speed: 420,
      heading: 270
    },
    {
      lat: 34.0522,
      lng: -118.2437,
      altitude: 15000,
      timestamp: Date.now() - 4 * 60 * 1000,
      speed: 435,
      heading: 272
    }
  ]);

  // Fetch real flight data from OpenSky API
  useEffect(() => {
    const fetchRealFlightData = async () => {
      try {
        const realData = await flightService.getFlightById(flight.id);
        if (realData) {
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
          
          // Generate history positions (simulate past 50 positions)
          const history: CoordinateHistory[] = [];
          for (let i = 50; i > 0; i--) {
            const timeOffset = i * 2 * 60 * 1000; // 2 minutes apart
            const latOffset = (Math.random() - 0.5) * 0.01 * i * 0.1;
            const lngOffset = (Math.random() - 0.5) * 0.01 * i * 0.1;
            history.push({
              lat: (realData.latitude || 34.0522) + latOffset,
              lng: (realData.longitude || -118.2437) + lngOffset,
              altitude: Math.max(10000, (realData.altitude || 19815) + (Math.random() - 0.5) * 2000),
              timestamp: Date.now() - timeOffset,
              speed: Math.max(200, (realData.speed || 450) + (Math.random() - 0.5) * 50),
              heading: ((realData.heading || 275) + (Math.random() - 0.5) * 20) % 360
            });
          }
          setFlightHistory(history);
        }
      } catch (error) {
        console.error('Error fetching real flight data:', error);
      }
    };

    fetchRealFlightData();
  }, [flight.id, flight.latitude, flight.longitude, flight.altitude, flight.speed, flight.heading]);

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

  // Real-time coordinate simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        latitude: prev.latitude + (Math.random() - 0.5) * 0.0001,
        longitude: prev.longitude + (Math.random() - 0.5) * 0.0001,
        altitude: Math.max(15000, prev.altitude + (Math.random() - 0.5) * 50),
        speed: Math.max(200, prev.speed + (Math.random() - 0.5) * 10),
        heading: (prev.heading + (Math.random() - 0.5) * 2) % 360,
        verticalSpeed: (Math.random() - 0.5) * 1000,
        groundSpeed: Math.max(200, prev.speed + (Math.random() - 0.5) * 20)
      }));
      setLastUpdate(Date.now());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Utility functions
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  const formatCoordinate = useCallback((coord: number, precision: number = 4) => {
    return coord.toFixed(precision);
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
  const handleRecordToggle = useCallback(() => {
    setIsRecording(prev => {
      if (!prev) {
        // Start recording - add current position to history
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
      }
      return !prev;
    });
  }, [liveMetrics]);

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
                {(realFlightData || flight).flightNumber || 'LNI080'}
              </h1>
            </div>
            <p className="text-cyan-300/80 font-mono text-lg tracking-wide">
              {(realFlightData || flight).origin || 'Indonesia'} → {(realFlightData || flight).destination || 'Unknown'}
            </p>
            <div className="mt-2 text-xs text-slate-400 font-mono uppercase tracking-widest">
              REAL-TIME AVIATION RADAR
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Left Panel - Previous Coordinates */}
            <div className="xl:col-span-3 order-2 xl:order-1">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-semibold text-cyan-400 uppercase tracking-wider">
                    Previous Coordinates
                  </h2>
                </div>
                
                {(showFullHistory ? flightHistory : coordinateHistory.slice(0, 2)).map((coord, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <CoordinatePanel
                      title={showFullHistory ? `Position ${flightHistory.length - index}` : `Position ${index + 1}`}
                      latitude={coord.lat}
                      longitude={coord.lng}
                      altitude={coord.altitude}
                      timestamp={formatTime(coord.timestamp)}
                    />
                  </div>
                ))}
                
                {/* Show Full History Button */}
                <div className="mt-3 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={handleShowFullHistory}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
                  >
                    <History className="w-4 h-4" />
                    {showFullHistory ? 'Show Recent Only' : 'Show Full History (50 positions)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Center Panel - Radar Display */}
            <div className="xl:col-span-6 order-1 xl:order-2 flex flex-col items-center space-y-4">
              {/* Radar Container */}
              <div className="relative flex flex-col items-center">
                <RadarDisplay 
                  sweepAngle={sweepAngle} 
                  radarRotation={radarRotation} 
                  flightNumber={(realFlightData || flight).flightNumber || '747'} 
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

              {/* Compass Component */}
              <Compass 
                radarRotation={radarRotation} 
                onResetToNorth={handleResetToNorth} 
              />
            </div>

            {/* Right Panel - Current Location & Status */}
            <div className="xl:col-span-3 order-3 space-y-3">
              {/* Current Location */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-green-400/20 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-green-400" />
                  <h2 className="text-base font-semibold text-green-400 uppercase tracking-wider">
                    Current Location
                  </h2>
                </div>
                
                <CoordinatePanel
                  title="Live Position"
                  latitude={liveMetrics.latitude}
                  longitude={liveMetrics.longitude}
                  altitude={liveMetrics.altitude}
                  timestamp={formatTime(lastUpdate)}
                />
              </div>

              {/* Flight Status Panel */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-green-400/20 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-semibold text-amber-400 uppercase tracking-wider">
                    Flight Status
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Speed:</span>
                    <span className="text-white font-mono text-lg">{formatSpeed(liveMetrics.speed)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Heading:</span>
                    <span className="text-white font-mono text-lg">{Math.round(liveMetrics.heading)}°</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Altitude:</span>
                    <span className="text-white font-mono text-lg">{formatAltitude(liveMetrics.altitude)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Aircraft:</span>
                    <span className="text-white font-mono text-sm">{(realFlightData || flight).aircraft || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Status:</span>
                    <StatusIndicator 
                      status={(realFlightData || flight).status?.toUpperCase() || 'ACTIVE'} 
                      color="#10B981" 
                    />
                  </div>
                </div>
              </div>
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