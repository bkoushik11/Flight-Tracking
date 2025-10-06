import React, { memo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightPositionProps {
  selectedFlight: any;
}

// Create airplane icon; for north-oriented, we keep heading at 0 visually
const createAirplaneIcon = (heading: number) => {
  return L.divIcon({
    className: 'custom-airplane-icon',
    html: `
      <div style="
        width: 24px; 
        height: 24px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transform: rotate(${heading}deg);
      ">
        <div style="
          font-size: 24px;
          color: #06b6d4;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">✈</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// North control button: orient map view to north (like Google Maps navigation)
const NorthControl: React.FC = () => {
  const map = useMap();
  
  const orientToNorth = () => {
    try {
      // Get current map state
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      // Set view to current position with north orientation
      // This ensures the map is oriented with north at the top
      map.setView([currentCenter.lat, currentCenter.lng], currentZoom, { 
        animate: true,
        duration: 0.5
      });
    } catch {}
  };
  
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <button
        onClick={orientToNorth}
        className="px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded text-cyan-300 hover:bg-cyan-500/20 text-xs transition-all"
        aria-label="Orient to North"
        title="Orient map view to north (like Google Maps navigation)"
      >
        N
      </button>
    </div>
  );
};

// Fit to current flight and follow it as it moves
const FitToFlight: React.FC<{ lat?: number; lng?: number; flightId?: string }> = ({ lat, lng, flightId }) => {
  const map = useMap();
  const lastFlightIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<[number, number] | null>(null);
  
  useEffect(() => {
    const currId = String(flightId ?? '');
    
    // If flight ID changed, fit to the flight position
    if (currId !== lastFlightIdRef.current) {
      lastFlightIdRef.current = currId;
      lastPositionRef.current = null;
      
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        try {
          // Set view to flight position with north orientation
          map.setView([lat as number, lng as number] as any, Math.max(map.getZoom(), 9), { animate: true });
          lastPositionRef.current = [lat as number, lng as number];
        } catch {}
      }
    }
    
    // If flight position changed, follow the flight (keep it centered)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const currentPos: [number, number] = [lat as number, lng as number];
      
      // Check if position has changed significantly
      if (!lastPositionRef.current || 
          Math.abs(lastPositionRef.current[0] - currentPos[0]) > 0.0001 || 
          Math.abs(lastPositionRef.current[1] - currentPos[1]) > 0.0001) {
        
        try {
          // Keep flight centered as it moves
          map.setView(currentPos, map.getZoom(), { animate: true });
          lastPositionRef.current = currentPos;
        } catch {}
      }
    }
  }, [lat, lng, flightId]);
  return null;
};

export const FlightPosition: React.FC<FlightPositionProps> = memo(({ selectedFlight }) => {
  // Always use flight position if available, otherwise fallback to India center
  const mapCenter: [number, number] = (selectedFlight?.latitude && selectedFlight?.longitude)
    ? [selectedFlight.latitude, selectedFlight.longitude]
    : [20.5937, 78.9629];
  
  const mapZoom = 9;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-2 flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-2 flex-shrink-0">Current Position</h2>
      <div className="flex-1 rounded-lg overflow-hidden min-h-0">
        <MapContainer 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          center={mapCenter}
          zoom={mapZoom}
        >
          {/* North control */}
          <NorthControl />
          <FitToFlight 
            lat={selectedFlight?.latitude} 
            lng={selectedFlight?.longitude} 
            flightId={selectedFlight?.id}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            keepBuffer={2}
          />
          
          {/* Flight marker - always show if flight has coordinates, rotated -90 degrees */}
          {selectedFlight?.latitude && selectedFlight?.longitude && (
            <Marker
              position={[selectedFlight.latitude, selectedFlight.longitude]}
              icon={createAirplaneIcon(-90)}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the selected flight has changed
  return prevProps.selectedFlight === nextProps.selectedFlight;
});