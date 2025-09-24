
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Flight } from '../types/flight';
import { getStatusColor, UI_CONFIG } from '../shared/constants';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Props for the FlightMap component
 */
interface FlightMapProps {
  flights: Flight[];
  onFlightClick?: (flight: Flight) => void;
  center?: [number, number];
}

/**
 * Memoized icon cache for flight markers
 */
const iconCache = new Map<string, Icon>();

/**
 * Create or retrieve a cached flight icon
 */
const createFlightIcon = (flight: Flight): Icon => {
  const color = getStatusColor(flight.status);
  const rotationBucket = Math.round(flight.heading / 15) * 15;
  const key = `${flight.status}:${rotationBucket}`;
  
  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotationBucket}deg)">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" stroke="white" stroke-width="1"/>
      </svg>
    `)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
  
  iconCache.set(key, icon);
  return icon;
};

/**
 * Flight marker component
 */
const FlightMarker = React.memo<{
  flight: Flight;
  onFlightClick?: (flight: Flight) => void;
}>(({ flight, onFlightClick }) => {
  const handleClick = useCallback(() => {
    onFlightClick?.(flight);
  }, [flight, onFlightClick]);

  const statusColor = getStatusColor(flight.status);

  return (
    <>
      <Marker
        position={[flight.latitude, flight.longitude]}
        icon={createFlightIcon(flight)}
        eventHandlers={{ click: handleClick }}
      >
        <Popup>
          <div className="p-2 min-w-48">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base">{flight.flightNumber}</h3>
              <span 
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: statusColor }}
              >
                {flight.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-800 text-xs">Destination</div>
                <div className="text-green-700 font-semibold">{flight.destination}</div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="font-medium">Altitude:</span>
                  <p>{flight.altitude.toLocaleString()} ft</p>
                </div>
                <div>
                  <span className="font-medium">Speed:</span>
                  <p>{flight.speed} kts</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>Route: {flight.origin} → {flight.destination}</p>
                <p>Aircraft: {flight.aircraft}</p>
                <p>Heading: {flight.heading}°</p>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
      {flight.path && flight.path.length > 1 && (
        <Polyline
          positions={(flight.path as LatLngExpression[]).slice(-20)}
          color={statusColor}
          weight={1.5}
          opacity={0.5}
        />
      )}
    </>
  );
});

FlightMarker.displayName = 'FlightMarker';

/**
 * Main FlightMap component
 */
export const FlightMap: React.FC<FlightMapProps> = ({ 
  flights,
  onFlightClick,
  center
}) => {
  const initialCenterRef = useRef<[number, number]>(center || UI_CONFIG.MAP_DEFAULT_CENTER);

  const VisibleFlights = () => {
    const map = useMap();
    const bounds = map.getBounds();
    const visible = useMemo(() => 
      flights.filter((f: Flight) => bounds.contains([f.latitude, f.longitude])), 
      [flights, bounds]
    );
    
    return (
      <>
        {visible.map((flight: Flight) => (
          <FlightMarker
            key={flight.id}
            flight={flight}
            onFlightClick={onFlightClick}
          />
        ))}
      </>
    );
  };

  return (
    <MapContainer
      center={initialCenterRef.current}
      zoom={3}
      className="h-full w-full"
      zoomControl={true}
      minZoom={2}
      worldCopyJump={true}
      preferCanvas={true}
      zoomSnap={0.5}
      zoomDelta={0.5}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="CARTO Voyager">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      
      <StartupFocus target={UI_CONFIG.MAP_DEFAULT_CENTER} zoom={UI_CONFIG.MAP_FOCUS_ZOOM} />
      
      <VisibleFlights />
    </MapContainer>
  );
};

/**
 * StartupFocus component
 */
const StartupFocus: React.FC<{ target: [number, number]; zoom: number }> = ({ target, zoom }) => {
  const map = useMap();
  const hasRunRef = useRef(false);
  
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    
    const timeoutId = setTimeout(() => {
      try {
        map.flyTo(target, zoom, { 
          animate: true, 
          duration: UI_CONFIG.ANIMATION_DURATION 
        });
      } catch (error) {
        console.warn('Map animation failed:', error);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [map, target, zoom]);
  
  return null;
};