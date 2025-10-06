import React, { memo } from 'react';
import { FlightPathMap } from './FlightPathMap';
import { TechnicalDetails } from './TechnicalDetails';
import { FlightPosition } from './FlightPosition';

interface LeftPanelProps {
  selectedFlight: any;
  onBackToMap?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = memo(({ selectedFlight, onBackToMap }) => {
  if (!selectedFlight) {
    return (
      <div className="h-full bg-gradient-to-br from-blue-900/30 to-cyan-800/20 backdrop-blur-sm border-r border-cyan-400/20 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cyan-300 mb-2">Flight Tracker</h1>
          <div className="w-16 h-1 mx-auto bg-cyan-400/50 rounded-full mb-4"></div>
          <p className="text-cyan-100/80 text-sm leading-relaxed">
            Click on any flight marker to view detailed information here.
          </p>
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
          >
            Back to Map
          </button>
        )}
      </div>
      
      {/* Two Column Layout */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* First Column - Divided into Two Rows */}
        <div className="w-1/2 flex flex-col gap-2">
          {/* Top Row - Technical Details */}
          <TechnicalDetails selectedFlight={selectedFlight} />
          
          {/* Bottom Row - Flight Icon Display */}
          <FlightPosition selectedFlight={selectedFlight} />
        </div>
        
        {/* Second Column - Flight Path Map */}
        <div className="w-1/2 bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-2 flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-2 flex-shrink-0">Flight Path</h2>
          <div className="flex-1 min-h-0">
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