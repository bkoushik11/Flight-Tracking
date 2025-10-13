import React, { memo } from 'react';
import FlightPathMap from './FlightPathMap';
import { TechnicalDetails } from './TechnicalDetails';
import { ArrowLeft } from 'lucide-react';


interface LeftPanelProps {
  selectedFlight: {
    id: string;
    flightNumber: string;
    origin?: string;
    destination?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    path?: [number, number][];
  };
  onBackToMap?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = memo(({ selectedFlight, onBackToMap }) => {
  if (!selectedFlight) {
    return (
      <div className="h-full bg-gradient-to-br from-blue-900/30 to-cyan-800/20 backdrop-blur-sm border-r border-cyan-400/20 flex items-center justify-center p-6">
        <div className="text-center">

          <div className="w-16 h-1 mx-auto bg-cyan-400/50 rounded-full mb-4"></div>
         
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-900/30 to-cyan-800/20 backdrop-blur-sm border-r border-cyan-400/20 p-3 flex flex-col">
      {/* Top Section - Back Button */}
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white">Flight Details</h2>
        {onBackToMap && (
          <button
            onClick={onBackToMap}
            className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
            aria-label='Back to Map'
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Vertical Layout - TechnicalDetails at top, FlightPathMap at bottom - 40% and 60% respectively */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {/* Top Section - Technical Details - 40% height */}
        <div className="h-2/5 min-h-0">
          <TechnicalDetails selectedFlight={selectedFlight} />
        </div>

        {/* Bottom Section - Flight Path Map - 60% height (maximized map area) */}
        <div className="h-3/5 min-h-0 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20">
          <div className="h-full w-full">
            <FlightPathMap selectedFlight={selectedFlight} />
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the selected flight has changed
  return prevProps.selectedFlight === nextProps.selectedFlight;
});