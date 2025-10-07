import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { FlightMap } from '../components/FlightMap';
import { Layers, MapLayerProvider } from '../components/Layers';
import { LeftPanel } from '../components/LeftPanel';
import { Flight } from '../types/flight';
import { Layers as LayersIcon } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import { INDIAN_AIRPORTS } from '../components/IndianAirports';

interface MapPageProps {
  flights: Flight[];
  user: any;
  onFlightClick: (flight: Flight) => void;
  onShowRecordings: () => void;
  onLogout: () => void;
  onMapClick: () => void;
  selectedFlight: Flight | null;
  onBackToMap: () => void;
  showLeftPanel: boolean;
}

const MapPageInner: React.FC<MapPageProps> = ({ 
  flights, 
  onFlightClick, 
  onShowRecordings, 
  onLogout,
  onMapClick,
  selectedFlight,
  onBackToMap,
  showLeftPanel
}) => {
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: string}[]>([]);
  const notificationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // const navigate = useNavigate();

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

  // Function to show airport notification for a specific flight
  const showAirportNotification = useCallback((flight: Flight) => {
    // Check if flight is near any airport
    const threshold = 0.01; // Approximately 1km
    for (const airport of INDIAN_AIRPORTS) {
      const distance = Math.sqrt(
        Math.pow(flight.latitude - airport.lat, 2) + 
        Math.pow(flight.longitude - airport.lng, 2)
      );
      
      if (distance < threshold) {
        // Flight is near airport
        const notificationId = `${flight.id}-${airport.name}`;
        
        // Check if we already have this notification
        if (!notifications.some(n => n.id === notificationId)) {
          let message = `${flight.flightNumber} is at ${airport.name} (${airport.city})`;
          
          // Add status-specific information
          if (flight.altitude < 1000) {
            message += ' - Landing';
          } else if (flight.altitude < 5000 && flight.speed < 200) {
            message += ' - Approaching';
          }
          
          // Add notification
          setNotifications(prev => [...prev, {id: notificationId, message, type: 'info'}]);
          
          // Remove notification after 5 seconds
          const timeout = setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            notificationTimeoutsRef.current.delete(notificationId);
          }, 5000);
          
          notificationTimeoutsRef.current.set(notificationId, timeout);
        }
        break; // Only show notification for the first nearby airport
      }
    }
  }, [notifications]);

  // Wrapper function for flight click that also shows airport notification
  const handleFlightClickWithNotification = useCallback((flight: Flight) => {
    onFlightClick(flight);
    showAirportNotification(flight);
  }, [onFlightClick, showAirportNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear notification timeouts
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeoutsRef.current.clear();
    };
  }, []);

  // Keep the right map container from remounting by stabilizing props/handlers
  // onFlightClick is memoized from parent; no extra wrapper needed

  return (
    <MapLayerProvider>
      <div className="h-screen w-full relative flex flex-col md:flex-row">
        {/* Left Panel - Only shown when showLeftPanel is true */}
        {showLeftPanel && selectedFlight && (
          <div className="w-full md:w-1/3 h-1/2 md:h-full z-[500] animate-slideInLeft transition-fast">
            <LeftPanel selectedFlight={selectedFlight} onBackToMap={onBackToMap} />
          </div>
        )}
        
        {/* Right Side - Always show the map */}
        <div className={showLeftPanel && selectedFlight ? "w-full md:w-2/3 h-1/2 md:h-full relative" : "w-full h-full relative"}>
          <FlightMap
            flights={flights}
            onFlightClick={handleFlightClickWithNotification}
            onMapClick={onMapClick}
            onMouseMove={handleMapMouseMove}
            selectedFlight={selectedFlight}
          />
          
          {/* Logout Button - Positioned at top right (full screen) or top left (split screen) */}
          <div className={`absolute ${selectedFlight ? 'top-4 left-4' : 'top-4 right-4'} z-[1000]`}>
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-red-400/40 rounded-lg flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/20 transition-all shadow-lg text-sm"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
          
          {/* Layers Control - Positioned below logout button */}
          <div className={`absolute ${selectedFlight ? 'top-20 left-4' : 'top-20 right-4'} z-[1000]`}>
            <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-lg shadow-lg">
              <Layers />
            </div>
          </div>
          
          {/* Latitude and Longitude Display - Positioned at bottom right of map area */}
          {mousePosition && (
            <div className="absolute bottom-4 right-24 bg-gray-700/90 backdrop-blur-sm border border-gray-500/50 rounded-lg px-3 py-2 shadow-lg z-[1000]">
              <div className="text-gray-200 text-sm font-mono flex flex-col items-center">
                <div>Lat: {mousePosition.lat.toFixed(6)}</div>
                <div>Lng: {mousePosition.lng.toFixed(6)}</div>
              </div>
            </div>
          )}
          
          {/* Airport Notifications */}
          <div className="absolute top-4 right-16 flex flex-col gap-2 z-[1000]">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn max-w-xs sm:max-w-sm"
              >
                <div className="flex items-center">
                  <span className="mr-2">✈️</span>
                  <span className="text-sm">{notification.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* User Controls - Positioned at top left (full screen) or top right (split screen) */}
        <div className={`absolute ${selectedFlight ? 'top-4 right-4' : 'top-4 left-4'} z-[1000]`}>
          <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-lg p-2 shadow-lg">
            <button
              onClick={onShowRecordings}
              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all text-xs"
            >
              <span className="hidden sm:inline">Show Recordings</span> <span className="sm:hidden">Recordings</span>
            </button>
          </div>
        </div>
        
      </div>
    </MapLayerProvider>
  );
};

// Memoize the MapPage to prevent unnecessary re-renders

export default MapPageInner;
