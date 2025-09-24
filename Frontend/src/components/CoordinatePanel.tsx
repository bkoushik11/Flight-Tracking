import React from 'react';

interface CoordinatePanelProps {
  title: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp?: string;
}

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  title,
  latitude,
  longitude,
  altitude,
  timestamp
}) => {
  return (
    <div className="rounded-lg p-4 space-y-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-400/20 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">
        {title}
      </h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">LAT:</span>
          <span className="text-sm text-white font-mono">
            {latitude.toFixed(4)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">LONG:</span>
          <span className="text-sm text-white font-mono">
            {longitude.toFixed(4)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">ALT:</span>
          <span className="text-sm text-white font-mono">
            {altitude.toLocaleString()} FT
          </span>
        </div>
        
        {timestamp && (
          <div className="pt-2 border-t border-green-400/20">
            <span className="text-xs text-gray-400 font-mono">
              {timestamp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatePanel;