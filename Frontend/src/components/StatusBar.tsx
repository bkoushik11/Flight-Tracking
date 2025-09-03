import React from 'react';
import { Wifi, WifiOff, Plane, RefreshCw } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  totalFlights: number;
  filteredFlights: number;
  lastUpdate?: Date | null;
  error?: string | null;
  onRefresh?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  totalFlights,
  filteredFlights,
  lastUpdate,
  error,
  onRefresh
}) => {
  return (
    <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {!error ? (
            <>
              <Wifi size={16} className="text-green-400" />
              <span>API Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-red-400" />
              <span>API Error</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Plane size={16} />
          <span>
            Showing {filteredFlights} of {totalFlights} flights
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {error && (
          <span className="text-red-400 text-xs">
            {error}
          </span>
        )}
        <div className="text-xs text-gray-400">
          Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </div>
      </div>
    </div>
  );
};