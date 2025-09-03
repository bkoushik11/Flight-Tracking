import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import { Icon, LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { Flight, RestrictedZone, Alert } from '../types/flight';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightMapProps {
  flights: Flight[];
  restrictedZones: RestrictedZone[];
  onAlertGenerated?: (alert: Alert) => void;
  onFlightClick?: (flight: Flight) => void;
  center?: [number, number];
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'on-time': return '#10b981';
    case 'delayed': return '#f59e0b';
    case 'landed': return '#6b7280';
    case 'lost-comm': return '#ef4444';
    case 'diverted': return '#8b5cf6';
    case 'emergency': return '#dc2626';
    default: return '#3b82f6';
  }
};

// Memoized icon cache keyed by status + coarse heading bucket
const iconCache = new Map<string, Icon>();
const createFlightIcon = (flight: Flight) => {
  const color = getStatusColor(flight.status);
  const rotationBucket = Math.round(flight.heading / 10) * 10; // 10-degree buckets
  const key = `${flight.status}:${rotationBucket}:${color}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotationBucket}deg)">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" stroke="white" stroke-width="0.5"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
  iconCache.set(key, icon);
  return icon;
};

const getZoneColor = (type: string): string => {
  switch (type) {
    case 'military': return '#dc2626';
    case 'airport': return '#f59e0b';
    case 'restricted': return '#ef4444';
    default: return '#6b7280';
  }
};

export const FlightMap: React.FC<FlightMapProps> = ({ 
  flights,
  restrictedZones, 
  onAlertGenerated,
  onFlightClick,
  center
}) => {
  const computedCenter: [number, number] = center || (
    flights.length > 0
      ? [
          flights.reduce((sum, f) => sum + f.latitude, 0) / flights.length,
          flights.reduce((sum, f) => sum + f.longitude, 0) / flights.length,
        ]
      : [20.0, 77.0] // India region where backend seeds
  );
  // Check for restricted zone violations
  useEffect(() => {
    if (!onAlertGenerated) return;
    
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
  }, [flights, restrictedZones, onAlertGenerated]);

  const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
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
  };

  const VisibleFlights = () => {
    const map = useMap();
    const bounds = map.getBounds();
    const visible = useMemo(() => flights.filter(f => bounds.contains([f.latitude, f.longitude])), [flights, bounds]);
    return (
      <>
        {visible.map(flight => (
          <div key={flight.id}>
            <Marker
              position={[flight.latitude, flight.longitude]}
              icon={createFlightIcon(flight)}
              eventHandlers={{
                click: () => onFlightClick?.(flight)
              }}
            >
              <Popup>
                <div className="p-3 min-w-64">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{flight.flightNumber}</h3>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getStatusColor(flight.status) }}
                    >
                      {flight.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Aircraft:</span>
                      <p>{flight.aircraft}</p>
                    </div>
                    <div>
                      <span className="font-medium">Route:</span>
                      <p>{flight.origin} → {flight.destination}</p>
                    </div>
                    <div>
                      <span className="font-medium">Altitude:</span>
                      <p>{flight.altitude.toLocaleString()} ft</p>
                    </div>
                    <div>
                      <span className="font-medium">Speed:</span>
                      <p>{flight.speed} kts</p>
                    </div>
                    <div>
                      <span className="font-medium">Heading:</span>
                      <p>{flight.heading}°</p>
                    </div>
                    <div>
                      <span className="font-medium">Last Update:</span>
                      <p>{flight.lastUpdate.toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Lat: {flight.latitude.toFixed(4)}</p>
                    <p>Lon: {flight.longitude.toFixed(4)}</p>
                  </div>
                  <button
                    onClick={() => onFlightClick?.(flight)}
                    className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
            {flight.path && flight.path.length > 1 && (
              <Polyline
                positions={flight.path as LatLngExpression[]}
                color={getStatusColor(flight.status)}
                weight={2}
                opacity={0.6}
              />
            )}
          </div>
        ))}
      </>
    );
  };

  const worldBounds: LatLngBoundsExpression = [
    [-85, -180],
    [85, 180]
  ];

  return (
    <MapContainer
      center={computedCenter}
      zoom={3}
      className="h-full w-full z-0"
      zoomControl={true}
      minZoom={2}
      worldCopyJump={true}
      preferCanvas={true}
      zoomSnap={0.5}
      zoomDelta={0.5}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
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

      {/* Flights: render only those in current viewport */}
      <VisibleFlights />
    </MapContainer>
  );
};