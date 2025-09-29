import React, { useState, useCallback, useMemo, memo } from 'react';
import { FlightMap } from '../components/FlightMap';
import { Flight } from '../types/flight';

// Memoized Coordinate Display Component
const CoordinateDisplay = memo(({ mousePosition }: { mousePosition: { lat: number; lng: number } | null }) => {
  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-xl px-4 py-2 shadow-lg z-[1000]">
      <div className="text-cyan-300 text-sm font-mono">
        {mousePosition 
          ? `Lat: ${mousePosition.lat.toFixed(6)}, Lng: ${mousePosition.lng.toFixed(6)}` 
          : 'Move cursor over map to see coordinates'}
      </div>
    </div>
  );
});

// Memoized User Controls Component
const UserControls = memo(({ user, onShowRecordings, onLogout }: { 
  user: any; 
  onShowRecordings: () => void;
  onLogout: () => void;
}) => {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[1000]">
      <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-xl p-3 shadow-lg">
        <div className="text-cyan-300 text-sm mb-2">
          Welcome, {user?.fullName || 'User'}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onShowRecordings}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
          >
            Show Recordings
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
});

interface MapPageProps {
  flights: Flight[];
  user: any;
  onFlightClick: (flight: Flight) => void;
  onShowRecordings: () => void;
  onLogout: () => void;
}

const MapPage: React.FC<MapPageProps> = memo(({ 
  flights, 
  user, 
  onFlightClick, 
  onShowRecordings, 
  onLogout 
}) => {
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);

  // Throttle mouse move updates to prevent excessive re-renders
  const handleMapMouseMove = useCallback((lat: number, lng: number) => {
    // Only update if the position has changed significantly
    setMousePosition(prev => {
      if (!prev || Math.abs(prev.lat - lat) > 0.0001 || Math.abs(prev.lng - lng) > 0.0001) {
        return { lat, lng };
      }
      return prev;
    });
  }, []);

  // Show all flights without filtering
  const displayFlights = useMemo(() => {
    return flights;
  }, [flights]);

  return (
    <div className="h-screen flex flex-col">
      {/* Main Map Area - Full Height */}
      <main style={{ 
        flex: 1, 
        height: '100vh',
        minHeight: '500px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <FlightMap
          flights={displayFlights}
          onFlightClick={onFlightClick}
          onMouseMove={handleMapMouseMove}
        />
        
        {/* Latitude and Longitude Display - Centered at Bottom */}
        <CoordinateDisplay mousePosition={mousePosition} />
        
        {/* User Controls - Positioned at bottom right */}
        <UserControls 
          user={user} 
          onShowRecordings={onShowRecordings}
          onLogout={onLogout}
        />
      </main>
    </div>
  );
});

export default MapPage;