import React, { memo } from 'react';
import { Plane, MapPin, Gauge, Navigation } from 'lucide-react';

interface TechnicalDetailsProps {
  selectedFlight: {
    id: string;
    flightNumber: string;
    status?: string;
    origin?: string;
    destination?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    path?: [number, number][];
  };
}

export const TechnicalDetails: React.FC<TechnicalDetailsProps> = memo(({ selectedFlight }) => {
  // Get origin and destination for display
  const origin = selectedFlight.origin || 'Unknown';
  const destination = selectedFlight.destination || 'Unknown';
  
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl h-full flex flex-col p-2">
      {/* Header with flight icon - Compact */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="p-1 bg-blue-500/20 rounded-lg">
          <Plane className="w-3 h-3 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{selectedFlight.flightNumber}</h2>
        </div>
      </div>

      {/* Route Information - Compact */}
      <div className="bg-slate-800/30 rounded-lg p-2 mb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span className="text-xs font-medium text-white">{origin}</span>
          </div>
          <div className="flex-1 mx-1 h-px bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600"></div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-white">{destination}</span>
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Flight Metrics - Compact Grid */}
      <div className="grid grid-cols-3 gap-1 mb-3 flex-shrink-0">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded p-1 border border-blue-500/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Navigation className="w-2.5 h-2.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">Altitude</span>
          </div>
          <p className="text-lg font-bold text-white">{selectedFlight.altitude?.toFixed(0) || 'N/A'}</p>
          <p className="text-xs text-blue-400">ft</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 rounded p-1 border border-emerald-500/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Gauge className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Speed</span>
          </div>
          <p className="text-lg font-bold text-white">{selectedFlight.speed?.toFixed(0) || 'N/A'}</p>
          <p className="text-xs text-emerald-400">kts</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded p-1 border border-purple-500/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Navigation className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Heading</span>
          </div>
          <p className="text-lg font-bold text-white">{selectedFlight.heading?.toFixed(0) || 'N/A'}</p>
          <p className="text-xs text-purple-400">deg</p>
        </div>
      </div>

      {/* Position Data */}
      <div className="bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-lg p-2 border border-slate-600/30 flex-shrink-0">
        <div className="flex items-center gap-1 mb-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-medium text-white">Position</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Lat</p>
            <p className="text-lg font-mono text-white">{selectedFlight.latitude?.toFixed(4) || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Lon</p>
            <p className="text-lg font-mono text-white">{selectedFlight.longitude?.toFixed(4) || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Re-render when selectedFlight reference changes or key live fields update
  const a = prevProps.selectedFlight;
  const b = nextProps.selectedFlight;
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.altitude === b.altitude &&
    a.speed === b.speed &&
    a.heading === b.heading &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude
  );
});