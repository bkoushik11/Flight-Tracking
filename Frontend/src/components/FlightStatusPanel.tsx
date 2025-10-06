import React from 'react';
import { MapPin, Gauge } from 'lucide-react';
import CoordinatePanel from './CoordinatePanel';

interface FlightStatusPanelProps {
  liveMetrics: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    heading: number;
  };
  realFlightData: any;
  flight: any;
  lastUpdate: number;
  // systemStatus: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  // radarRotation: number;
  formatTime: (timestamp: number) => string;
  formatAltitude: (alt: number) => string;
  formatSpeed: (speed: number) => string;
}

const FlightStatusPanel: React.FC<FlightStatusPanelProps> = ({
  liveMetrics,
  realFlightData,
  flight,
  lastUpdate,
  // systemStatus,
  // radarRotation,
  formatTime,
  formatAltitude,
  formatSpeed
}) => {
  // Status indicator component
  const StatusIndicator: React.FC<{ status: string; color: string }> = ({ status, color }) => (
    <div className="flex items-center gap-2">
      <div 
        className={`w-2 h-2 rounded-full animate-pulse ${color === '#10B981' ? 'bg-emerald-500' : 'bg-cyan-500'}`}
      />
      <span className={`text-sm font-medium ${color === '#10B981' ? 'text-emerald-500' : 'text-cyan-500'}`}>
        {status}
      </span>
    </div>
  );

  // Log when live metrics update
  React.useEffect(() => {
    console.log('📊 FlightStatusPanel live metrics updated:', liveMetrics);
  }, [liveMetrics]);

  return (
    <div className="space-y-3">
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
            <span className="text-white font-mono text-sm">{realFlightData?.aircraft || flight.aircraft || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 text-sm uppercase tracking-wide">Status:</span>
            <StatusIndicator 
              status={(realFlightData?.status?.toUpperCase() || flight.status?.toUpperCase() || 'ACTIVE')} 
              color="#10B981" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightStatusPanel;