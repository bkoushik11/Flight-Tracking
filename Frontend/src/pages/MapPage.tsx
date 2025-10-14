import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FlightMap } from '../components/FlightMap';
import { Layers, MapLayerProvider } from '../components/Layers';
import { LeftPanel } from '../components/LeftPanel';
import { Flight } from '../types/flight';
import { INDIAN_AIRPORTS } from '../components/IndianAirports';
import L from 'leaflet';
import { addRecordedPosition, startRecording, stopRecording } from '../services/flightService';

interface MapPageProps {
  flights: Flight[];
  user: any;
  onFlightClick: (flight: Flight) => void;
  onLogout: () => void;
  onMapClick: () => void;
  selectedFlight: Flight | null;
  onBackToMap: () => void;
  showLeftPanel: boolean;
  onShowPathTrack?: () => void;
}

const MapPageInner: React.FC<MapPageProps> = ({ 
  flights, 
  onFlightClick, 
  onLogout,
  onMapClick,
  selectedFlight,
  onBackToMap,
  showLeftPanel,
  onShowPathTrack
}) => {
  const [mousePosition, setMousePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: string}[]>([]);
  const notificationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [drawnRectangles, setDrawnRectangles] = useState<L.LatLngBounds[]>([]);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const recordingFlightIdRef = useRef<string | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  // const navigate = useNavigate();

  // Backend now sends only 2 flights, so we can use them directly
  const filteredFlights = flights;

  // Throttle mouse move updates to prevent excessive re-renders
  const handleMapMouseMove = useCallback((lat: number, lng: number) => {
    // Only update if the position has changed significantly
    setMousePosition(prev => {
      if (!prev || Math.abs(prev.lat - lat) > 0.005 || Math.abs(prev.lng - lng) > 0.005) {
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

  // Handle rectangle drawing - simplified
  const handleRectangleDrawn = useCallback((bounds: L.LatLngBounds) => {
    setDrawnRectangles(prev => [...prev, bounds]);
    setIsDrawingActive(false); // Reset drawing state after rectangle is drawn
    
    // Show simple notification
    const notificationId = `rectangle-${Date.now()}`;
    const message = `Rectangle drawn successfully`;
    
    setNotifications(prev => [...prev, {id: notificationId, message, type: 'info'}]);
    
    // Remove notification after 3 seconds
    const timeout = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      notificationTimeoutsRef.current.delete(notificationId);
    }, 3000);
    
    notificationTimeoutsRef.current.set(notificationId, timeout);
  }, []);

  // New function to zoom to the last drawn rectangle
  // const handleZoomToLastRectangle = useCallback(() => {
  //   if (drawnRectangles.length > 0) {
  //     const lastRectangle = drawnRectangles[drawnRectangles.length - 1];
  //     const map = (window as any).mapInstance;
  //     if (map) {
  //       map.fitBounds(lastRectangle, { padding: [50, 50] });
  //     }
  //   }
  // }, [drawnRectangles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear notification timeouts
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeoutsRef.current.clear();
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, []);

  // Handle map resize when panel state changes
  useEffect(() => {
    // Trigger map resize when panel state changes
    const timer = setTimeout(() => {
      const mapInstance = (window as any).mapInstance;
      if (mapInstance && mapInstance.invalidateSize) {
        mapInstance.invalidateSize();
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [showLeftPanel]);
  // Recording controls
  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop
      const fid = recordingFlightIdRef.current;
      if (fid) {
        try { await stopRecording(fid); } catch {}
      }
      setIsRecording(false);
      recordingFlightIdRef.current = null;
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setRecordSeconds(0);
      return;
    }
    // Start: require a selected flight
    if (!selectedFlight) {
      // show ephemeral notification
      const notificationId = `rec-${Date.now()}`;
      setNotifications(prev => [...prev, { id: notificationId, message: 'Select a flight to start recording', type: 'info' }]);
      const timeout = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        notificationTimeoutsRef.current.delete(notificationId);
      }, 2500);
      notificationTimeoutsRef.current.set(notificationId, timeout as any);
      return;
    }
    try {
      await startRecording(selectedFlight.id);
      setIsRecording(true);
      setRecordSeconds(0);
      recordingFlightIdRef.current = selectedFlight.id;
      // poll every 3s to append current selected flight position, even if user clicks other flights
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = window.setInterval(async () => {
        // tick seconds display
        setRecordSeconds((s) => s + 1);
        const fid = recordingFlightIdRef.current;
        if (!fid) return;
        // Find latest position for that flight from flights stream
        const f = flights.find(fl => fl.id === fid);
        if (!f || !Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) return;
        try {
          await addRecordedPosition({
            flightId: fid,
            latitude: f.latitude,
            longitude: f.longitude,
            heading: f.heading,
            altitude: f.altitude,
            speed: f.speed
          });
        } catch {}
      }, 1000);
    } catch (e) {
      // show error
      const notificationId = `rec-err-${Date.now()}`;
      setNotifications(prev => [...prev, { id: notificationId, message: 'Failed to start recording', type: 'error' }]);
      const timeout = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        notificationTimeoutsRef.current.delete(notificationId);
      }, 2500);
      notificationTimeoutsRef.current.set(notificationId, timeout as any);
    }
  }, [isRecording, selectedFlight, flights]);


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
        <div className={showLeftPanel && selectedFlight ? "w-full md:w-2/3 h-1/2 md:h-full relative" : "w-full h-full relative"} key={showLeftPanel ? 'split' : 'full'}>
          <FlightMap
            flights={filteredFlights}
            onFlightClick={handleFlightClickWithNotification}
            onMapClick={onMapClick}
            onMouseMove={handleMapMouseMove}
            selectedFlight={selectedFlight}
            pastTrack={undefined}
            onRectangleDrawn={handleRectangleDrawn}
            showLeftPanel={showLeftPanel}
            onBackToMap={onBackToMap}
          />
          
          {/* Logout Button - Positioned at top right (full screen) or top left (split screen) */}
          <div className="absolute bottom-4 right-4 z-[1000]">
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-red-400/40 rounded-lg flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/20 transition-all shadow-lg text-sm"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              
            </button>
          </div>
          
          {/* PathTrack Nav Button */}
          {onShowPathTrack && (
            <div className="absolute top-4 right-2 z-[1000] mb-2">
              <button
                onClick={onShowPathTrack}
                className="px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-md shadow-lg text-yellow-300 hover:bg-cyan-500/20 transition-all text-sm font-medium"
                title="Go to Path Track"
              >
                Path Track
              </button>
            </div>
          )}
          
          {/* Layers Control */}
          <div className="absolute top-16 right-2 z-[1000]">
            <div className="inline-flex p-0.5 bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-md shadow-lg">
              <Layers />
            </div>
          </div>
          
          {/* Drawing Controls */}
          <div className="absolute top-24 right-2 z-[1000]">
            <div className="mt-2">
              <div className="px-1 py-1 flex flex-col gap-2">
                {/* Rectangle Drawing Icon */}
                <button
                  onClick={() => {
                    // Simple rectangle drawing activation
                    const map = (window as any).mapInstance;
                    if (map && map.enableRectangleDrawing) {
                      map.enableRectangleDrawing();
                      setIsDrawingActive(true);
                    }
                  }}
                  className={`p-2 rounded transition-all ${
                    isDrawingActive 
                      ? 'bg-blue-500/40 text-blue-200' 
                      : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  }`}
                  title={isDrawingActive ? "Rectangle drawing active - Click and drag on map" : "Draw Rectangle"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen">
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
                  </svg>
                </button>
                
                {/* Clear Drawing Icon */}
                <button
                  onClick={() => {
                    // Clear all drawn rectangles
                    setDrawnRectangles([]);
                    setIsDrawingActive(false);
                    const map = (window as any).mapInstance;
                    if (map && map.drawnLayers) {
                      map.drawnLayers.clearLayers();
                    }
                  }}
                  className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition-all"
                  title="Clear All"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Record Button - Bottom left */}
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2">
            <button
              onClick={handleToggleRecording}
              className={`px-3 py-2 rounded-lg shadow-lg text-sm border transition-all ${
                isRecording
                  ? 'bg-red-600/80 text-white border-red-400 hover:bg-red-600'
                  : 'bg-emerald-600/80 text-white border-emerald-400 hover:bg-emerald-600'
              }`}
              aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? 'Stop' : 'Record'}
            </button>
            {isRecording && (
              <span className="text-white text-sm font-mono">{recordSeconds}s</span>
            )}
          </div>
          
          {/* Latitude and Longitude Display - Positioned at same level as zoom controls */}
          {mousePosition && (
            <div className="absolute bottom-20 right-20 bg-gray-700/90 backdrop-blur-sm border border-gray-500/50 rounded-lg px-3 py-2 shadow-lg z-[1000]">
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


          {/* Drawn Rectangles Info */}
          {drawnRectangles.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
              <div className="bg-slate-900/90 backdrop-blur-md border border-blue-400/40 rounded-lg px-3 py-2 shadow-lg">
                <div className="text-blue-300 text-sm font-medium">
                  Drawn Areas: {drawnRectangles.length}
                </div>
                <div className="text-blue-200 text-xs">
                  Use the draw tool to create rectangles
                </div>
              </div>
            </div>
          )}

        </div>
        
        
        
      </div>
    </MapLayerProvider>
  );
};

// Memoize the MapPage to prevent unnecessary re-renders

export default MapPageInner;
