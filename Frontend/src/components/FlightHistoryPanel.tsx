import React from 'react';
import { Clock, History } from 'lucide-react';
import CoordinatePanel from './CoordinatePanel';

interface CoordinateHistory {
  lat: number;
  lng: number;
  timestamp: number;
}

interface FlightHistoryPanelProps {
  showFullHistory: boolean;
  flightHistory: CoordinateHistory[];
  coordinateHistory: CoordinateHistory[];
  onToggleHistory: () => void;
  formatTime: (timestamp: number) => string;
}

const FlightHistoryPanel: React.FC<FlightHistoryPanelProps> = ({
  showFullHistory,
  flightHistory,
  coordinateHistory,
  onToggleHistory,
  formatTime
}) => {
  // Log when history updates
  React.useEffect(() => {
    console.log('📊 FlightHistoryPanel updated:', {
      showFullHistory,
      flightHistoryLength: flightHistory.length,
      coordinateHistoryLength: coordinateHistory.length
    });
  }, [showFullHistory, flightHistory, coordinateHistory]);

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-3 max-h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-cyan-400" />
        <h2 className="text-base font-semibold text-cyan-400 uppercase tracking-wider">
          Previous Coordinates
        </h2>
        {(showFullHistory && flightHistory.length > 5) && (
          <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
            {flightHistory.length} positions
          </span>
        )}
      </div>
      
      <div className="overflow-y-auto flex-grow pr-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-slate-700/30 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
        {/* Header showing count when in full history mode */}
        {showFullHistory && flightHistory.length > 0 && (
          <div className="text-xs text-cyan-400/70 mb-2 px-2 py-1 bg-cyan-500/10 rounded">
            Showing {flightHistory.length} of 50 most recent positions
          </div>
        )}
        
        {(showFullHistory ? flightHistory : coordinateHistory.slice(0, 2)).map((coord, index) => (
          <div 
            key={index} 
            className="mb-2 last:mb-0 transition-all duration-300 hover:bg-slate-800/30 p-1 rounded-lg"
          >
            <CoordinatePanel
              title={`Position ${index + 1}`}
              latitude={coord.lat}
              longitude={coord.lng}
              timestamp={formatTime(coord.timestamp)}
            />
          </div>
        ))}
        
        {/* Empty state when no history */}
        {(showFullHistory ? flightHistory.length === 0 : coordinateHistory.slice(0, 2).length === 0) && (
          <div className="text-center py-4 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No position history available</p>
          </div>
        )}
      </div>
      
      {/* Show Full History Button */}
      <div className="mt-3 pt-2 border-t border-slate-700/50">
        <button
          onClick={onToggleHistory}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
        >
          <History className="w-4 h-4" />
          {showFullHistory ? 'Show Recent Only' : `Show Full History (${flightHistory.length > 0 ? flightHistory.length : coordinateHistory.length} positions)`}
        </button>
      </div>
    </div>
  );
};

export default FlightHistoryPanel;