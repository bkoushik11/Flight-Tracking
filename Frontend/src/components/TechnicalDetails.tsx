import React, { memo } from 'react';

interface TechnicalDetailsProps {
  selectedFlight: any;
}

export const TechnicalDetails: React.FC<TechnicalDetailsProps> = memo(({ selectedFlight }) => {
  // Get origin and destination for display
  const origin = selectedFlight.origin || 'Unknown';
  const destination = selectedFlight.destination || 'Unknown';
  
  // Format the flight path for display
  const formatTrajectory = () => {
    if (!selectedFlight.path || selectedFlight.path.length === 0) {
      return 'No flight path data available';
    }
    
    return `${selectedFlight.path.length} positions recorded`;
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-2 flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-2 flex-shrink-0">Technical Data</h2>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div>
          <p className="text-cyan-200 text-sm">Flight</p>
          <p className="text-white font-medium">{selectedFlight.flightNumber}</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Trajectory</p>
          <p className="text-white">{formatTrajectory()}</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Status</p>
          <p className="text-white capitalize">{selectedFlight.status || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Origin</p>
          <p className="text-white">{origin}</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Destination</p>
          <p className="text-white">{destination}</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Altitude</p>
          <p className="text-white">{selectedFlight.altitude?.toFixed(0) || 'N/A'} ft</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Speed</p>
          <p className="text-white">{selectedFlight.speed?.toFixed(0) || 'N/A'} knots</p>
        </div>
        <div>
          <p className="text-cyan-200 text-sm">Heading</p>
          <p className="text-white">{selectedFlight.heading?.toFixed(0) || 'N/A'}°</p>
        </div>
        <div className="col-span-2">
          <p className="text-cyan-200 text-sm">Position</p>
          <p className="text-white">
            {selectedFlight.latitude?.toFixed(4) || 'N/A'}, {selectedFlight.longitude?.toFixed(4) || 'N/A'}
          </p>
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
    a.longitude === b.longitude &&
    a.status === b.status
  );
});