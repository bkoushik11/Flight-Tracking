import React from 'react';
import { Wifi, WifiOff, Plane, RefreshCw } from 'lucide-react';

/**
 * Props for the StatusBar component
 */
interface StatusBarProps {
  isConnected: boolean;
  totalFlights: number;
  filteredFlights: number;
  lastUpdate?: Date | null;
  error?: string | null;
  onRefresh?: () => void;
}

/**
 * StatusBar component
 * Displays application status information at the bottom of the screen
 * 
 * Features:
 * - Connection status indicator
 * - Flight count display
 * - Last update timestamp
 * - Error message display
 * - Manual refresh functionality
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  totalFlights,
  filteredFlights,
  lastUpdate,
  error,
  onRefresh
}) => {
  return (
    <div className="midnight-panel px-4 py-2 flex items-center justify-between text-sm midnight-glow"
         style={{ borderTop: '1px solid rgba(0, 217, 255, 0.3)' }}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {!error ? (
            <>
              <Wifi size={16} className="midnight-text-accent" />
              <span className="midnight-text-primary">API Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="midnight-text-critical" />
              <span className="midnight-text-critical">API Error</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Plane size={16} className="midnight-text-accent" />
          <span className="midnight-text-primary">
            Showing {filteredFlights} of {totalFlights} flights
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1 midnight-button px-2 py-1 rounded transition-colors"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {error && (
          <span className="midnight-text-critical text-xs">
            {error}
          </span>
        )}
        <div className="text-xs midnight-text-secondary">
          Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </div>
      </div>
    </div>
  );
};