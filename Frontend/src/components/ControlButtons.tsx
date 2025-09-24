import React from 'react';
import { Navigation, Circle, Square } from 'lucide-react';

interface ControlButtonsProps {
  isRecording: boolean;
  onRecordToggle: () => void;
  onRotateMap: () => void;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
  isRecording,
  onRecordToggle,
  onRotateMap
}) => {
  return (
    <div className="flex gap-4">
      {/* Record Button */}
      <button
        onClick={onRecordToggle}
        className={`
          relative px-6 py-3 border-2 rounded-lg transition-all duration-200 outline-none
          ${isRecording 
            ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20' 
            : 'border-green-400/50 bg-green-400/10 hover:bg-green-400/20'
          }
        `}
      >
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <Square className="w-4 h-4 text-red-500 fill-red-500" />
              <span className="text-sm font-medium text-red-500">STOP</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 text-green-400 fill-green-400" />
              <span className="text-sm font-medium text-green-400">RECORD</span>
            </>
          )}
        </div>
        {isRecording && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </button>
      
      {/* Map Rotation Button */}
      <button
        onClick={onRotateMap}
        className="px-6 py-3 border-2 border-green-400/50 bg-green-400/10 hover:bg-green-400/20 group rounded-lg transition-all duration-200 outline-none"
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-green-400 group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-sm font-medium text-green-400">NORTH</span>
        </div>
      </button>
    </div>
  );
};

export default ControlButtons;