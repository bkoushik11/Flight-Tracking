import React from 'react';
import { Compass as CompassIcon } from 'lucide-react';

interface CompassProps {
  radarRotation: number;
  onResetToNorth: () => void;
  className?: string;
}

const Compass: React.FC<CompassProps> = ({ radarRotation, onResetToNorth, className }) => {
  return (
    <div className="flex justify-center gap-2">
      <button
        onClick={onResetToNorth}
        className={`group p-3 rounded-xl transition-all duration-300 bg-slate-900/80 hover:bg-slate-800/90 border border-green-400/30 hover:border-green-400/60 backdrop-blur-md shadow-lg hover:shadow-green-400/20 ${
          radarRotation !== 0 ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
        }`}
        
      >
        <div 
          className="relative w-6 h-6 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${-radarRotation}deg)` }}
        >
          <CompassIcon className={`w-6 h-6 text-green-400 group-hover:text-green-300 ${className || ''}`} />
          {/* Enhanced North indicator */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-lg" />
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-500">N</div>
        </div>
      </button>
      
      {/* Rotation Status Indicator */}
      <div className="flex items-center px-3 py-2 bg-slate-900/40 border border-green-400/20 rounded-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 border-2 border-green-400 rounded-full transition-transform duration-300 ease-in-out"
            style={{ transform: `rotate(${radarRotation}deg)` }}
          >
            <div className="w-0.5 h-1 bg-green-400 ml-1" />
          </div>
          <span className="text-green-400 text-xs font-mono">{radarRotation}°</span>
        </div>
      </div>
    </div>
  );
};

export default Compass;