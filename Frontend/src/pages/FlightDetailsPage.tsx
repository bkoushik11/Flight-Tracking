import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Flight, FlightStatus } from '../types/flight';
import { ArrowLeft, Compass, Activity, MapPin, Clock, Navigation, Gauge } from 'lucide-react';
import RadarDisplay from '../components/RadarDisplay';
import CoordinatePanel from '../components/CoordinatePanel';
import ControlButtons from '../components/ControlButtons';

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
  
  // Live flight metrics with real-time simulation
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    latitude: flight.latitude || 34.0522,
    longitude: flight.longitude || -118.2437,
    altitude: flight.altitude || 19815,
    speed: flight.speed || 450,
    heading: flight.heading || 275,
    verticalSpeed: 0,
    groundSpeed: flight.speed || 450
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
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-2xl bg-slate-900/60 border border-cyan-400/30 backdrop-blur-md">
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent tracking-wider">
                {flight.flightNumber || 'LNI080'}
              </h1>
            </div>
            <p className="text-cyan-300/80 font-mono text-lg tracking-wide">
              {flight.origin || 'Indonesia'} → {flight.destination || 'Unknown'}
            </p>
            <div className="mt-3 text-xs text-slate-400 font-mono uppercase tracking-widest">
              REAL-TIME AVIATION RADAR
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Panel - Previous Coordinates */}
            <div className="xl:col-span-3 order-2 xl:order-1">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-cyan-400 uppercase tracking-wider">
                    Previous Coordinates
                  </h2>
                </div>
                
                {coordinateHistory.slice(0, 2).map((coord, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <CoordinatePanel
                      title={`Position ${index + 1}`}
                      latitude={coord.lat}
                      longitude={coord.lng}
                      altitude={coord.altitude}
                      timestamp={formatTime(coord.timestamp)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Center Panel - Radar Display */}
            <div className="xl:col-span-6 order-1 xl:order-2 flex flex-col items-center space-y-8">
              {/* Radar Container */}
              <div className="relative flex flex-col items-center">
                <RadarDisplay rotation={radarRotation} />
                
                {/* Flight Info Overlay */}
                <div className="mt-4">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-400/30 rounded-xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-cyan-400" />
                      <span className="text-cyan-400 font-mono text-sm">
                        FLIGHT {flight.flightNumber || '747'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="w-full flex justify-center">
                <ControlButtons
                  isRecording={isRecording}
                  onRecordToggle={handleRecordToggle}
                  onRotateMap={handleRotateMap}
                />
              </div>
            </div>

            {/* Right Panel - Current Location & Status */}
            <div className="xl:col-span-3 order-3 space-y-6">
              {/* Current Location */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-semibold text-green-400 uppercase tracking-wider">
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
              <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Gauge className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-amber-400 uppercase tracking-wider">
                    Flight Status
                  </h3>
                </div>
                
                <div className="space-y-4">
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
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm uppercase tracking-wide">Status:</span>
                    <StatusIndicator 
                      status={flight.status?.toUpperCase() || 'ACTIVE'} 
                      color="#10B981" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="mt-8 bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm uppercase tracking-wide">System Status:</span>
                  <StatusIndicator status={systemStatus} color="#10B981" />
                </div>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-mono">Radar: {radarRotation}°</span>
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