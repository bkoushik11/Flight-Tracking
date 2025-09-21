import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, LayersControl } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Flight, RestrictedZone, Alert } from '../types/flight';
import { getStatusColor, getZoneColor, UI_CONFIG } from '../shared/constants';
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
  restrictedZones: RestrictedZone[];
  onAlertGenerated?: (alert: Alert) => void;
  onFlightClick?: (flight: Flight) => void;
  center?: [number, number];
}

/**
 * Memoized icon cache for flight markers
 * Caches icons by status and heading bucket to improve performance
 */
const iconCache = new Map<string, Icon>();

/**
 * Create or retrieve a cached flight icon
 * Uses 15-degree heading buckets for efficient caching
 * @param flight - Flight object containing status and heading
 * @returns Leaflet Icon object
 */
const createFlightIcon = (flight: Flight): Icon => {
  const color = getStatusColor(flight.status);
  const rotationBucket = Math.round(flight.heading / 15) * 15; // 15-degree buckets for better caching
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
 * Memoized flight marker component to reduce re-renders
 * Renders individual flight markers with popups and flight paths
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
            <button
              onClick={handleClick}
              className="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
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
 * Renders an interactive map with flight markers, restricted zones, and real-time updates
 * 
 * Features:
 * - Real-time flight tracking with status-based colors
 * - Restricted zone visualization
 * - Interactive flight popups with detailed information
 * - Flight path trails
 * - Automatic alert generation for zone violations
 */
export const FlightMap: React.FC<FlightMapProps> = ({ 
  flights,
  restrictedZones, 
  onAlertGenerated,
  onFlightClick,
  center
}) => {
  const initialCenterRef = useRef<[number, number]>(center || UI_CONFIG.MAP_DEFAULT_CENTER);
  
  // Memoized distance calculation
  const calculateDistance = useCallback((pos1: [number, number], pos2: [number, number]): number => {
    const [lat1, lon1] = pos1;
    const [lat2, lon2] = pos2;
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Check for restricted zone violations with throttling
  useEffect(() => {
    if (!onAlertGenerated) return;
    
    const checkViolations = () => {
      flights.forEach(flight => {
        restrictedZones.forEach(zone => {
          const distance = calculateDistance(
            [flight.latitude, flight.longitude],
            zone.center
          );
          
          if (distance <= zone.radius) {
            onAlertGenerated({
              id: `${flight.id}-${zone.id}-${Date.now()}`,
              flightId: flight.id,
              type: 'restricted-zone',
              message: `Flight ${flight.flightNumber} has entered restricted zone ${zone.name}`,
              timestamp: new Date(),
              severity: 'high'
            });
          }
        });
      });
    };

    // Throttle violation checks to prevent excessive alerts
    const timeoutId = setTimeout(checkViolations, 1000);
    return () => clearTimeout(timeoutId);
  }, [flights, restrictedZones, onAlertGenerated, calculateDistance]);

  const VisibleFlights = () => {
    const map = useMap();
    const bounds = map.getBounds();
    const visible = useMemo(() => 
      flights.filter(f => bounds.contains([f.latitude, f.longitude])), 
      [flights, bounds]
    );
    
    return (
      <>
        {visible.map(flight => (
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
      
      {/* Restricted Zones */}
      {restrictedZones.map(zone => (
        <Circle
          key={zone.id}
          center={zone.center}
          radius={zone.radius}
          color={getZoneColor(zone.type)}
          fillColor={getZoneColor(zone.type)}
          fillOpacity={0.1}
          weight={2}
          dashArray="5, 5"
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-red-600">{zone.name}</h3>
              <p className="text-sm">Type: {zone.type}</p>
              <p className="text-sm">Radius: {(zone.radius / 1000).toFixed(1)}km</p>
            </div>
          </Popup>
        </Circle>
      ))}

      <VisibleFlights />
    </MapContainer>
  );
};

/**
 * StartupFocus component
 * Animates the map to focus on a specific location when the component mounts
 * Only runs once to avoid unnecessary animations
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